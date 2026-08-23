import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/Cart.schema';
import { Rider, RiderDocument } from '../schemas/Rider.schema';
import { Order, OrderDocument, OrderStatus } from '../schemas/Order.schema';
import {
  DeliveryAddress,
  DeliveryAddressDocument,
} from '../schemas/DeliveryAddress.schema';
import { User, UserDocument, UserRole } from '../schemas/User.schema';
import { CreateOrderDto, OrderResponseDto } from './dto/order.dto';
import { Restaurant, RestaurantDocument } from '../schemas/Restaurant.schema';
import { Vendor, VendorDocument } from '../schemas/Vendor.schema';
import { OrderEventsService } from './order-events.service';
import { NotificationsService } from '../notifications/notifications.service';

export type OrderRequester = { sub: string; role: UserRole };

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Rider.name) private riderModel: Model<RiderDocument>,
    @InjectModel(DeliveryAddress.name)
    private addressModel: Model<DeliveryAddressDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly orderEvents: OrderEventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async calculatePricing(input: {
    subtotal: number;
    restaurantId: string;
  }) {
    const serviceFee = Math.round(input.subtotal * 0.1);
    const deliveryFee = await this.calculateDeliveryFee(input.restaurantId);
    const total = input.subtotal + serviceFee + deliveryFee;

    return {
      serviceFee,
      deliveryFee,
      total,
    };
  }

  private async calculateDeliveryFee(restaurantId: string) {
    return 4000;
  }

  private calculateItemSubtotal(item: any): number {
    const choicesCost = Array.isArray(item.selectedChoices)
      ? item.selectedChoices.reduce(
          (sum, choice) => sum + (Number(choice.price) || 0),
          0,
        )
      : 0;
    return (item.price + choicesCost) * item.quantity;
  }

  async create(userId: string, createDto: CreateOrderDto) {
    if (!createDto.items?.length || !createDto.restaurantId) {
      throw new BadRequestException(
        'Orders require either a cartId or full item/total/restaurant details',
      );
    }

    const userProfile = await this.userModel
      .findOne({ _id: userId, isActive: true })
      .exec();
    if (!userProfile) {
      throw new NotFoundException(
        'User profile not found or account is deactivated',
      );
    }

    const cart = await this.cartModel
      .findOne({ userId, isDeleted: false })
      .exec();

    const orderItems = createDto.items.map((item) => {
      const cartItem = cart?.items.find(
        (cItem) => cItem.productId.toString() === item.productId,
      );

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        selectedChoices: item.selectedChoices || [],
        subtotal: this.calculateItemSubtotal(item),
        image: cartItem?.image
          ? { url: cartItem.image.url, publicId: cartItem.image.publicId }
          : undefined,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const pricing = await this.calculatePricing({
      subtotal: subtotal,
      restaurantId: createDto.restaurantId,
    });

    const orderData: Partial<Order> = {
      restaurantId: createDto.restaurantId,
      user: {
        userId: userId,
        lastName: userProfile.lastName || '',
        firstName: userProfile.firstName || '',
        phoneNumber: userProfile.phoneNumber || '',
      },
      items: orderItems,
      deliveryAddress: createDto.deliveryAddress,
      notes: createDto.notes,
      paymentStatus: 'pending',
      subtotal,
      serviceFee: pricing.serviceFee,
      deliveryFee: pricing.deliveryFee,
      total: pricing.total,
    };

    const order = new this.orderModel(orderData);
    const savedOrder = await order.save();
    const mappedOrder = this.mapOrderResponse(savedOrder);

    await this.orderEvents.publish({
      type: 'OrderPlacedEvent',
      orderId: savedOrder._id.toString(),
      order: mappedOrder,
    });

    await this.handleOrderEvent({
      type: 'OrderPlacedEvent',
      orderId: savedOrder._id.toString(),
      order: mappedOrder,
    });

    await this.cartModel
      .findOneAndUpdate(
        { userId, isDeleted: false },
        {
          items: [],
          total: 0,
          restaurantId: null,
        },
      )
      .exec();

    try {
      const addr = createDto.deliveryAddress;
      if (addr && typeof addr === 'object') {
        const count = await this.addressModel
          .countDocuments({ consumerId: userId, isDeleted: false })
          .exec();

        if (!count) {
          await this.addressModel.create({
            consumerId: userId,
            label: addr.label || 'Home',
            addressLine: addr.addressLine || '',
            city: addr.city,
            state: addr.state,
            postalCode: addr.postalCode,
            country: addr.country,
            location: addr.location,
            instructions: addr.instructions,
            isDefault: true,
          });
        }
      }
    } catch (e) {
      console.error('Error saving first delivery address:', e);
    }

    return this.mapOrderResponse(savedOrder);
  }

  async getCheckoutSummary(userId: string) {
    const cart = await this.cartModel.findOne({ userId, isDeleted: false });

    if (!cart || !cart.items.length) {
      throw new NotFoundException('Cart is empty');
    }

    const restaurant = await this.restaurantModel.findById(cart.restaurantId);
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const calculatedSubtotal = cart.items.reduce((sum, item) => {
      return sum + (item.subtotal || this.calculateItemSubtotal(item));
    }, 0);

    const pricing = await this.calculatePricing({
      subtotal: calculatedSubtotal,
      restaurantId: cart.restaurantId,
    });

    return {
      restaurantId: restaurant.id,
      subtotal: calculatedSubtotal,
      serviceFee: pricing.serviceFee,
      deliveryFee: pricing.deliveryFee,
      total: pricing.total,
      items: cart.items.map((item) => ({
        productId: item.productId.toString(),
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal || this.calculateItemSubtotal(item),
        image: item.image?.url
          ? { url: item.image.url, publicId: item.image.publicId }
          : undefined,
        selectedChoices: ((item as any).selectedChoices || []).map(
          (choice: any) => ({
            groupName: choice.groupName || 'Options',
            name: choice.name,
            price: choice.price,
          }),
        ),
      })),
    };
  }

  private async getRestaurantIdForUser(userId: string) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();
    if (!vendor) {
      throw new ForbiddenException(
        'No active vendor profile associated with this account.',
      );
    }

    const vendorId = vendor.id || vendor._id.toString();

    const restaurant = await this.restaurantModel
      .findOne({ vendorId: vendorId.toString(), isActive: true })
      .exec();
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return restaurant._id.toString();
  }

  private async getRiderIdForUser(userId: string) {
    const rider = await this.riderModel
      .findOne({ userId, isDeleted: false })
      .exec();
    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }
    return rider._id.toString();
  }

  private async canAccessOrder(
    order: OrderDocument,
    requester: OrderRequester,
  ): Promise<boolean> {
    if (requester.role === UserRole.ADMIN) {
      return true;
    }
    if (requester.role === UserRole.CONSUMER) {
      // Supports both new 'userId' and legacy 'id' DB property formats for access checks
      const orderConsumerId = order.user?.userId || (order.user as any)?.id;
      return orderConsumerId === requester.sub;
    }
    if (requester.role === UserRole.VENDOR) {
      const restaurantId = await this.getRestaurantIdForUser(requester.sub);
      return order.restaurantId === restaurantId;
    }
    if (requester.role === UserRole.RIDER) {
      if (!order.riderId) {
        return false;
      }
      const riderId = await this.getRiderIdForUser(requester.sub);
      return order.riderId === riderId;
    }
    return false;
  }

  async assertOrderAccessible(
    orderId: string,
    requester: OrderRequester,
  ): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOne({ _id: orderId, isDeleted: false })
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    if (!(await this.canAccessOrder(order, requester))) {
      throw new ForbiddenException('You cannot access this order');
    }
    return order;
  }

  async findById(id: string, requester: OrderRequester) {
    const order = await this.assertOrderAccessible(id, requester);
    return this.mapOrderResponse(order);
  }

  async findByUser(userId: string, skip: number = 0, limit: number = 20) {
    // Queries matching both 'user.userId' and legacy 'user.id' fields in MongoDB
    const orders = await this.orderModel
      .find({
        $or: [{ 'user.userId': userId }, { 'user.id': userId }],
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return orders.map((order) => this.mapOrderResponse(order));
  }

  async findByRestaurant(
    restaurantId: string,
    skip: number = 0,
    limit: number = 20,
  ) {
    const orders = await this.orderModel
      .find({ restaurantId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return orders.map((order) => this.mapOrderResponse(order));
  }

  async findByRestaurantUser(
    userId: string,
    skip: number = 0,
    limit: number = 20,
  ) {
    const restaurantId = await this.getRestaurantIdForUser(userId);
    return this.findByRestaurant(restaurantId, skip, limit);
  }

  async findAll(skip: number = 0, limit: number = 20) {
    const orders = await this.orderModel
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return orders.map((order) => this.mapOrderResponse(order));
  }

  async analytics() {
    const totalOrders = await this.orderModel.countDocuments({
      isDeleted: false,
    });
    const byStatus = await this.orderModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return { totalOrders, byStatus };
  }

  async restaurantAnalytics(restaurantId: string) {
    const totalOrders = await this.orderModel.countDocuments({
      restaurantId,
      isDeleted: false,
    });
    const byStatus = await this.orderModel.aggregate([
      { $match: { restaurantId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return { restaurantId, totalOrders, byStatus };
  }

  async restaurantAnalyticsByUser(userId: string) {
    const restaurantId = await this.getRestaurantIdForUser(userId);
    return this.restaurantAnalytics(restaurantId);
  }

  private async applyStatusUpdate(id: string, status: OrderStatus) {
    const order = await this.orderModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { status },
        { new: true },
      )
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const mappedOrder = this.mapOrderResponse(order);
    const eventType = this.getEventTypeForStatus(status);
    await this.orderEvents.publish({
      type: eventType,
      orderId: id,
      order: mappedOrder,
    });

    await this.handleOrderEvent({
      type: eventType,
      orderId: id,
      order: mappedOrder,
    });

    return mappedOrder;
  }

  private getEventTypeForStatus(status: OrderStatus) {
    switch (status) {
      case OrderStatus.ACCEPTED:
        return 'OrderAcceptedEvent';
      case OrderStatus.DECLINED:
        return 'OrderRejectedEvent';
      case OrderStatus.PREPARING:
        return 'OrderPreparingEvent';
      case OrderStatus.READY_FOR_PICKUP:
        return 'OrderReadyEvent';
      case OrderStatus.DELIVERED:
        return 'OrderDeliveredEvent';
      case OrderStatus.CANCELLED_BY_CONSUMER:
      case OrderStatus.CANCELLED_BY_VENDOR:
        return 'OrderCancelledEvent';
      default:
        return 'OrderStatusUpdatedEvent';
    }
  }

  async acceptOrder(id: string, requester: OrderRequester) {
    return this.updateStatus(id, OrderStatus.ACCEPTED, requester);
  }

  async rejectOrder(id: string, requester: OrderRequester) {
    return this.updateStatus(id, OrderStatus.DECLINED, requester);
  }

  async cancelOrder(id: string, requester: OrderRequester) {
    const status =
      requester.role === UserRole.VENDOR
        ? OrderStatus.CANCELLED_BY_VENDOR
        : OrderStatus.CANCELLED_BY_CONSUMER;
    return this.updateStatus(id, status, requester);
  }

  private async handleOrderEvent(event: {
    type: string;
    orderId: string;
    order: OrderResponseDto;
  }) {
    try {
      if (event.type === 'OrderPlacedEvent') {
        const restaurant = await this.restaurantModel
          .findById(event.order.restaurantId)
          .exec();
        if (restaurant?.vendorId) {
          const vendor = await this.vendorModel
            .findOne({ userId: restaurant.vendorId })
            .exec();
          const vendorUser = vendor
            ? await this.userModel.findOne({ _id: vendor.userId }).exec()
            : null;
          const vendorEmail = vendorUser?.email;
          if (vendorEmail) {
            const orderRef = event.order.orderReference || event.order._id;
            const customerName = event.order.user?.firstName
              ? `${event.order.user.firstName} ${event.order.user.lastName || ''}`.trim()
              : 'A customer';
            const itemCount = event.order.items?.length || 0;
            await this.notificationsService.sendEmail({
              to: vendorEmail,
              subject: `New order received for ${orderRef}`,
              body: `Hello,\n\nA new order has been placed for your restaurant.\n\nOrder reference: ${orderRef}\nCustomer: ${customerName}\nItems: ${itemCount}\n\nPlease review and accept or decline it promptly.`,
            });
          }
        }
      }

      // NOTIFY CONSUMER FOR ALL STATUS UPDATES
      const orderDb = await this.orderModel.findById(event.order._id).exec();
      const customerUserId = orderDb?.user?.userId;

      const customerUser = customerUserId
             ? await this.userModel.findOne({ _id: customerUserId }).exec()
              : null;
      const customerEmail = customerUser?.email;

      if (customerEmail) {
        const orderRef = event.order.orderReference || event.order._id;
        const customerFirstName = customerUser.firstName || 'Customer';

        // Custom email text based on exact status transition
        let emailSubject = `Update on your order ${orderRef}`;
        let emailBody = `Hello ${customerFirstName},\n\nYour order ${orderRef} status is now: ${event.order.status}.`;

        switch (event.type) {
          case 'OrderAcceptedEvent':
            emailSubject = `Order Accepted - ${orderRef}`;
            emailBody = `Hello ${customerFirstName},\n\nThe restaurant has accepted your order! They will begin preparing your food shortly.`;
            break;
          case 'OrderPreparingEvent':
            emailSubject = `Food is Being Prepared - ${orderRef}`;
            emailBody = `Hello ${customerFirstName},\n\nYour order is currently being prepared in the kitchen.`;
            break;
          case 'OrderReadyEvent':
            emailSubject = `Order Ready for Pickup - ${orderRef}`;
            emailBody = `Hello ${customerFirstName},\n\nYour order is ready! A rider will pick it up soon.`;
            break;
          case 'OrderDeliveredEvent':
            emailSubject = `Order Delivered - ${orderRef}`;
            emailBody = `Hello ${customerFirstName},\n\nYour order has been delivered! Enjoy your meal.`;
            break;
          case 'OrderRejectedEvent':
            emailSubject = `Order Declined - ${orderRef}`;
            emailBody = `Hello ${customerFirstName},\n\nUnfortunately, the restaurant declined your order. If you were charged, a refund will be processed.`;
            break;
          case 'OrderCancelledEvent':
            emailSubject = `Order Cancelled - ${orderRef}`;
            emailBody = `Hello ${customerFirstName},\n\nYour order ${orderRef} has been cancelled.`;
            break;
        }

        await this.notificationsService.sendEmail({
          to: customerEmail,
          subject: emailSubject,
          body: emailBody,
        });
      }

      if (
        event.type === 'OrderAcceptedEvent' ||
        event.type === 'OrderRejectedEvent' ||
        event.type === 'OrderCancelledEvent'
      ) {
        await this.notificationsService.sendEmail({
          to: 'support@chopbaze.com',
          subject: `Order ${event.order.orderReference || event.order._id} update`,
          body: `Order ${event.order.orderReference || event.order._id} has moved to ${event.order.status}.`,
        });
      }
    } catch (error) {
      console.error('Failed to notify order event', error);
    }
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    requester: OrderRequester,
  ) {
    const order = await this.assertOrderAccessible(id, requester);

    if (requester.role === UserRole.ADMIN) {
      return this.applyStatusUpdate(id, status);
    }

    if (requester.role === UserRole.CONSUMER) {
      if (status !== OrderStatus.CANCELLED_BY_CONSUMER) {
        throw new ForbiddenException(
          'Consumers may only cancel orders (cancelled_by_consumer).',
        );
      }
      const cancellable = [
        OrderStatus.PENDING,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
      ];
      if (!cancellable.includes(order.status)) {
        throw new BadRequestException(
          'Order cannot be cancelled at this stage',
        );
      }
      return this.applyStatusUpdate(id, status);
    }

    if (requester.role === UserRole.VENDOR) {
      const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [
          OrderStatus.ACCEPTED,
          OrderStatus.DECLINED,
          OrderStatus.CANCELLED_BY_VENDOR,
        ],
        [OrderStatus.ACCEPTED]: [
          OrderStatus.PREPARING,
          OrderStatus.CANCELLED_BY_VENDOR,
        ],
        [OrderStatus.DECLINED]: [],
        [OrderStatus.PREPARING]: [
          OrderStatus.READY_FOR_PICKUP,
          OrderStatus.CANCELLED_BY_VENDOR,
        ],
        [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.DELIVERED],
        [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED_BY_CONSUMER]: [],
        [OrderStatus.CANCELLED_BY_VENDOR]: [],
      };

      if (!allowedTransitions[order.status]?.includes(status)) {
        throw new BadRequestException(
          `Invalid transition from ${order.status} to ${status}`,
        );
      }

      return this.applyStatusUpdate(id, status);
    }

    if (requester.role === UserRole.RIDER) {
      if (status !== OrderStatus.DELIVERED) {
        throw new ForbiddenException(
          'Riders may only mark orders as delivered.',
        );
      }
      if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
        throw new BadRequestException(
          'Order must be out for delivery before it can be delivered.',
        );
      }
      const riderId = await this.getRiderIdForUser(requester.sub);
      if (order.riderId !== riderId) {
        throw new ForbiddenException('This order is not assigned to you');
      }
      return this.applyStatusUpdate(id, status);
    }

    throw new ForbiddenException();
  }

  async assignRider(
    orderId: string,
    riderId: string,
    requester: OrderRequester,
  ) {
    if (
      requester.role !== UserRole.ADMIN &&
      requester.role !== UserRole.VENDOR
    ) {
      throw new ForbiddenException('Only vendors or admins can assign riders');
    }

    const order = await this.orderModel
      .findOne({ _id: orderId, isDeleted: false })
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (requester.role === UserRole.VENDOR) {
      const restaurantId = await this.getRestaurantIdForUser(requester.sub);

      if (order.restaurantId !== restaurantId) {
        throw new ForbiddenException(
          'You can only assign riders to your restaurant orders',
        );
      }
    }

    const rider = await this.riderModel
      .findOne({ _id: riderId, isDeleted: false })
      .exec();
    if (!rider) {
      throw new BadRequestException('Rider not found');
    }

    const updated = await this.orderModel
      .findOneAndUpdate(
        { _id: orderId, isDeleted: false },
        { riderId, status: OrderStatus.OUT_FOR_DELIVERY },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    return this.mapOrderResponse(updated);
  }

  private mapOrderResponse(order: OrderDocument): OrderResponseDto {
    return {
      _id: order._id.toString(),
      serialNumber: order.serialNumber,
      restaurantId: order.restaurantId,
      orderReference: order.orderReference,
      user: {
        firstName: order.user?.firstName || '',
        lastName: order.user?.lastName || '',
        phoneNumber: order.user?.phoneNumber || '',
      },
      items: order.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        subtotal: item.subtotal || this.calculateItemSubtotal(item),
        image: item.image?.url
          ? { url: item.image.url, publicId: item.image.publicId }
          : undefined,
        selectedChoices: ((item as any).selectedChoices || []).map(
          (choice: any) => ({
            groupName: choice.groupName || 'Options',
            name: choice.name,
            price: choice.price,
          }),
        ),
      })),
      subtotal: order.subtotal,
      serviceFee: order.serviceFee,
      deliveryFee: order.deliveryFee,
      total: order.total,
      deliveryAddress: order.deliveryAddress,
      status: order.status,
      notes: order.notes,
      riderId: order.riderId,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
