import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
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
import { OrderEventPayload, OrderEventsService } from './order-events.service';
import { NotificationsService } from '../notifications/notifications.service';

export type OrderRequester = { sub: string; role: UserRole };

@Injectable()
export class OrdersService implements OnModuleInit {
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

  // Subscribe to internal order event bus upon module initialization
  onModuleInit() {
    this.orderEvents.subscribe((event) => this.handleOrderEvent(event));
    console.log('[OrdersService] Subscribed to OrderEventsService');
  }

  // Calculate pricing breakdown including platform service fees and delivery costs
  private async calculatePricing(input: {
    subtotal: number;
    restaurantId: string;
  }) {
    const serviceFee = Math.round(input.subtotal * 0.1);
    const deliveryFee = await this.calculateDeliveryFee(input.restaurantId);
    const total = input.subtotal + serviceFee + deliveryFee;

    return { serviceFee, deliveryFee, total };
  }

  // Determine delivery fee for the specified restaurant
  private async calculateDeliveryFee(restaurantId: string) {
    return 4000;
  }

  // Calculate total line item price including optional choice add-ons
  private calculateItemSubtotal(item: any): number {
    const choicesCost = Array.isArray(item.selectedChoices)
      ? item.selectedChoices.reduce(
          (sum, choice) => sum + (Number(choice.price) || 0),
          0,
        )
      : 0;
    return (item.price + choicesCost) * item.quantity;
  }

  // Create a new order document and clear active consumer cart items
  async create(userId: string, createDto: CreateOrderDto) {
    if (!createDto.items?.length || !createDto.restaurantId) {
      throw new BadRequestException(
        'Orders require either a cartId or full item/total/restaurant details',
      );
    }

    // Query identity user record directly from UserModel for names and contact details
    const userProfile = await this.userModel
      .findOne({ _id: userId, isActive: true })
      .exec();

    if (!userProfile) {
      throw new NotFoundException(
        'User account not found or is currently deactivated',
      );
    }

    const cart = await this.cartModel
      .findOne({ userId, isDeleted: false })
      .exec();

    // Map order items and attach product image references if available from cart
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
      subtotal,
      restaurantId: createDto.restaurantId,
    });

    // Populate order user payload directly from UserModel document fields, preserving snapshot email
    const orderData: Partial<Order> = {
      restaurantId: createDto.restaurantId,
      user: {
        userId: userProfile._id.toString(),
        email: userProfile.email || '',
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

    // Reset active cart items after successfully creating the order
    await this.cartModel
      .findOneAndUpdate(
        { userId, isDeleted: false },
        { items: [], total: 0, restaurantId: null },
      )
      .exec();

    // Auto-save delivery address to consumer profile if no previous address exists
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

  // Retrieve pricing and line-item breakdown for cart checkout verification
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

  // Resolve restaurant ID linked to a vendor user account
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

  // Resolve rider ID linked to a rider user account
  private async getRiderIdForUser(userId: string) {
    const rider = await this.riderModel
      .findOne({ userId, isDeleted: false })
      .exec();
    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }
    return rider._id.toString();
  }

  // Enforce role-based permission checks for reading order documents
  private async canAccessOrder(
    order: OrderDocument,
    requester: OrderRequester,
  ): Promise<boolean> {
    if (requester.role === UserRole.ADMIN) {
      return true;
    }
    if (requester.role === UserRole.CONSUMER) {
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

  // Validate order existence and user access control
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

  // Fetch a single order by ID with access verification
  async findById(id: string, requester: OrderRequester) {
    const order = await this.assertOrderAccessible(id, requester);
    return this.mapOrderResponse(order);
  }

  // Fetch paginated orders placed by a specific consumer
  async findByUser(userId: string, skip: number = 0, limit: number = 20) {
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

  // Fetch paginated orders assigned to a specific restaurant
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

  // Fetch paginated orders for vendor management view
  async findByRestaurantUser(
    userId: string,
    skip: number = 0,
    limit: number = 20,
  ) {
    const restaurantId = await this.getRestaurantIdForUser(userId);
    return this.findByRestaurant(restaurantId, skip, limit);
  }

  // Fetch all orders for platform administration
  async findAll(skip: number = 0, limit: number = 20) {
    const orders = await this.orderModel
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return orders.map((order) => this.mapOrderResponse(order));
  }

  // Aggregate global order status counts
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

  // Aggregate order metrics for a single restaurant
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

  // Fetch analytics metrics for a vendor user account
  async restaurantAnalyticsByUser(userId: string) {
    const restaurantId = await this.getRestaurantIdForUser(userId);
    return this.restaurantAnalytics(restaurantId);
  }

  // Update order status in database and emit state transition event
  private async applyStatusUpdate(
    id: string,
    status: OrderStatus,
    additionalFields: Partial<Order> = {},
  ) {
    const order = await this.orderModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { status, ...additionalFields },
        { new: true },
      )
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const eventType = this.getEventTypeForStatus(status);
    
    // Publish event to trigger automated notification handler
    await this.orderEvents.publish({
      type: eventType,
      orderId: id,
      order: order.toObject(),
    });
    
    return this.mapOrderResponse(order);
  }

  // Map database order status enum to event topics
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
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'OrderOutForDeliveryEvent';
      case OrderStatus.DELIVERED:
        return 'OrderDeliveredEvent';
      case OrderStatus.CANCELLED_BY_CONSUMER:
      case OrderStatus.CANCELLED_BY_VENDOR:
        return 'OrderCancelledEvent';
      default:
        return 'OrderStatusUpdatedEvent';
    }
  }

  // Convenience wrapper for vendor order acceptance
  async acceptOrder(id: string, requester: OrderRequester) {
    return this.updateStatus(id, OrderStatus.ACCEPTED, requester);
  }

  // Convenience wrapper for vendor order rejection
  async rejectOrder(id: string, requester: OrderRequester) {
    return this.updateStatus(id, OrderStatus.DECLINED, requester);
  }

  // Convenience wrapper for cancellation requests
  async cancelOrder(id: string, requester: OrderRequester) {
    const status =
      requester.role === UserRole.VENDOR
        ? OrderStatus.CANCELLED_BY_VENDOR
        : OrderStatus.CANCELLED_BY_CONSUMER;
    return this.updateStatus(id, status, requester);
  }

  // Handle incoming system events to send email notifications
  private async handleOrderEvent(event: OrderEventPayload) {
    try {
      console.log(
        `[EVENT RECEIVED IN ORDERS SERVICE]: ${event.type} for Order: ${event.orderId}`,
      );

      const order = event.order;
      if (!order) {
        console.warn(
          `[Order Event Warning] No order payload passed for ID: ${event.orderId}`,
        );
        return;
      }

      // Vendor Email Logic
      if (event.type === 'OrderPlacedEvent') {
        const restaurant = await this.restaurantModel
          .findById(order.restaurantId)
          .exec();

        if (restaurant?.vendorId) {
          const vendor =
            (await this.vendorModel
              .findOne({ _id: restaurant.vendorId })
              .exec()) ||
            (await this.vendorModel
              .findOne({ userId: restaurant.vendorId })
              .exec());

          // Query vendor user account directly from UserModel for email credential
          const vendorUser = vendor
            ? await this.userModel.findOne({ _id: vendor.userId }).exec()
            : null;

          const vendorEmail = vendorUser?.email;

          if (vendorEmail) {
            try {
              const orderRef = order.orderReference || order._id || event.orderId;
              const customerName = order.user?.firstName
                ? `${order.user.firstName} ${order.user.lastName || ''}`.trim()
                : 'A customer';
              const itemCount = order.items?.length || 0;

              console.log(
                `[Vendor Email] Notifying vendor at: ${vendorEmail} for Order Ref: ${orderRef}`,
              );

              await this.notificationsService.sendEmail({
                to: vendorEmail,
                subject: `New order received - Ref: ${orderRef}`,
                body: `Hello,\n\nA new order has been paid and placed for your restaurant.\n\nOrder reference: ${orderRef}\nCustomer: ${customerName}\nItems: ${itemCount}\n\nPlease review and accept or decline it promptly.`,
              });

              console.log(`[Vendor Email] Sent successfully to: ${vendorEmail}`);
            } catch (rawError) {
               console.error(
                `[Vendor Email Error] Email sending failed during execution for Order Ref: ${order.orderReference}\n` +
                `  - Target Email: ${vendorEmail}\n` +
                `  - Raw Error:`, rawError
              );
            }
          } else {
            console.warn(
              `[Vendor Email Warning] No email found for vendor on restaurant: ${order.restaurantId}`,
            );
          }
        }
      }

      // Consumer Email Logic
      const orderUser = order.user as any;
      const userEmail = orderUser?.email;
      const customerUserId = orderUser?.userId || orderUser?.id || orderUser?._id;

      let customerEmail = userEmail;
      let customerFirstName = order.user?.firstName;

      if (!customerEmail && customerUserId) {
        const customerUser = await this.userModel
          .findOne({ _id: customerUserId }, { email: 1, firstName: 1 })
          .exec();

        customerEmail = customerUser?.email;
        customerFirstName = customerFirstName || customerUser?.firstName;
      }

      if (customerEmail) {
        const orderRef = order.orderReference || order._id || event.orderId;
        const greetingName = customerFirstName || 'Customer';

        let emailSubject = `Update on your order ${orderRef}`;
        let emailBody = `Hello ${greetingName},\n\nYour order ${orderRef} status is now: ${order.status}.`;

        switch (event.type) {
          case 'OrderPlacedEvent':
            emailSubject = `Order Placed Successfully - ${orderRef}`;
            emailBody = `Hello ${greetingName},\n\nYour order ${orderRef} has been placed and payment confirmed. The restaurant will review it shortly!`;
            break;
          case 'OrderAcceptedEvent':
            emailSubject = `Order Accepted - ${orderRef}`;
            emailBody = `Hello ${greetingName},\n\nThe restaurant accepted your order and will start preparing it soon.`;
            break;
          case 'OrderPreparingEvent':
            emailSubject = `Food is Being Prepared - ${orderRef}`;
            emailBody = `Hello ${greetingName},\n\nYour order is currently being prepared in the kitchen.`;
            break;
          case 'OrderReadyEvent':
            emailSubject = `Order Ready for Pickup - ${orderRef}`;
            emailBody = `Hello ${greetingName},\n\nYour order is ready! A rider will pick it up soon.`;
            break;
          case 'OrderOutForDeliveryEvent':
            emailSubject = `Order Out for Delivery - ${orderRef}`;
            emailBody = `Hello ${greetingName},\n\nYour order is on its way! A rider has picked up your food.`;
            break;
          case 'OrderDeliveredEvent':
            emailSubject = `Order Delivered - ${orderRef}`;
            emailBody = `Hello ${greetingName},\n\nYour order has been delivered! Enjoy your meal.`;
            break;
          case 'OrderRejectedEvent':
            emailSubject = `Order Declined - ${orderRef}`;
            emailBody = `Hello ${greetingName},\n\nUnfortunately, the restaurant declined your order. Your payment will be refunded.`;
            break;
          case 'OrderCancelledEvent':
            emailSubject = `Order Cancelled - ${orderRef}`;
            emailBody = `Hello ${greetingName},\n\nYour order ${orderRef} has been cancelled.`;
            break;
        }

        try {
          console.log(
            `[Consumer Email] Notifying consumer at: ${customerEmail} (Event: ${event.type})`,
          );

          await this.notificationsService.sendEmail({
            to: customerEmail,
            subject: emailSubject,
            body: emailBody,
          });

          console.log(`[Consumer Email] Sent successfully to: ${customerEmail}`);
        } catch (rawError) {
          // Captures runtime/network/service errors from the email service provider
          console.error(
            `[Consumer Email Error] Email sending failed during execution for Event: ${event.type}\n` +
            `  - Target User ID: ${customerUserId}\n` +
            `  - Target Email: ${customerEmail}\n` +
            `  - Raw Error:`, rawError
          );
        }
      } else {
        // Captures missing/invalid email payload data before sending
        console.warn(
          `[Consumer Email Warning] Failed to send email for Event: ${event.type}\n` +
          `  - Target User ID: ${customerUserId}\n` +
          `  - Received Email Value: ${JSON.stringify(customerEmail)}\n` +
          `  - Raw Order User Payload: ${JSON.stringify(event.order?.user || order?.user)}`
        );
      }

      // 3. Platform Admin Alerts
      if (
        event.type === 'OrderAcceptedEvent' ||
        event.type === 'OrderRejectedEvent' ||
        event.type === 'OrderCancelledEvent'
      ) {
        try {
          const orderRef = order.orderReference || order._id || event.orderId;
          await this.notificationsService.sendEmail({
            to: 'support@chopbaze.com',
            subject: `Order ${orderRef} update`,
            body: `Order ${orderRef} moved to state: ${order.status}.`,
          });
        } catch (rawError) {
           console.error(`[Admin Email Error] Failed to send admin alert for Order ${order._id}:`, rawError);
        }
      }
    } catch (error) {
      // Catch-all for outer logic errors (database queries, etc.)
      console.error(
        '[Event Handling Error] Failed to process order event notification',
        error,
      );
    }
  }

  // Validate state transitions based on requester user roles
  async updateStatus(
    id: string,
    status: OrderStatus,
    requester: OrderRequester,
  ) {
    const order = await this.assertOrderAccessible(id, requester);

    // Administrative override permission
    if (requester.role === UserRole.ADMIN) {
      return this.applyStatusUpdate(id, status);
    }

    // Consumer cancellation policy enforcement
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

    // Vendor workflow transition validations
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

    // Rider fulfillment transition checks
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

  // Assign delivery rider and transition order state to out for delivery
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

    return this.applyStatusUpdate(orderId, OrderStatus.OUT_FOR_DELIVERY, {
      riderId,
    });
  }

  // Sanitize database document into client response DTO omitting sensitive fields
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