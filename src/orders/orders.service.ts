import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/Cart.schema';
import { Vendor, VendorDocument } from '../schemas/Vendor.schema';
import { Rider, RiderDocument } from '../schemas/Rider.schema';
import { Order, OrderDocument, OrderStatus } from '../schemas/Order.schema';
import { UserRole } from '../schemas/User.schema';
import { CreateOrderDto, OrderResponseDto } from './dto/order.dto';

export type OrderRequester = { sub: string; role: UserRole };

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(Rider.name) private riderModel: Model<RiderDocument>,
  ) { }

  async create(userId: string, createDto: CreateOrderDto) {
    let orderData: Partial<Order> = {
      userId,
      deliveryAddress: createDto.deliveryAddress,
      notes: createDto.notes,
      paymentStatus: 'pending',
    };

    if (createDto.cartId) {
      const cart = await this.cartModel
        .findOne({ _id: createDto.cartId, userId, isDeleted: false })
        .exec();
      if (!cart || !cart.items.length) {
        throw new BadRequestException('Cart not found or empty');
      }
      orderData = {
        ...orderData,
        vendorId: cart.vendorId,
        items: cart.items,
        total: cart.total,
        orderReference: createDto.orderReference,
      };
      await this.cartModel.findByIdAndUpdate(cart._id, {
        items: [],
        total: 0,
        vendorId: null,
      });
    } else {
      if (!createDto.items?.length || !createDto.total || !createDto.vendorId) {
        throw new BadRequestException(
          'Orders require either a cartId or full item/total/vendor details',
        );
      }
      orderData = {
        ...orderData,
        vendorId: createDto.vendorId,
        items: createDto.items,
        total: createDto.total,
        orderReference: createDto.orderReference,
      };
    }

    const order = new this.orderModel(orderData);
    const savedOrder = await order.save();
    return this.mapOrderResponse(savedOrder)
  }

  private async getVendorIdForUser(userId: string) {
    const vendor = await this.vendorModel
      .findOne({ userId, isDeleted: false })
      .exec();
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return vendor._id.toString();
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
      return order.userId === requester.sub;
    }
    if (requester.role === UserRole.VENDOR) {
      const vendorId = await this.getVendorIdForUser(requester.sub);
      return order.vendorId === vendorId;
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
    const orders = await this.orderModel
      .find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return orders.map((order) => this.mapOrderResponse(order));
  }

  async findByVendor(vendorId: string, skip: number = 0, limit: number = 20) {
    const orders = await this.orderModel
      .find({ vendorId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return orders.map((order) => this.mapOrderResponse(order));
  }

  async findByVendorUser(userId: string, skip: number = 0, limit: number = 20) {
    const vendorId = await this.getVendorIdForUser(userId);
    return this.findByVendor(vendorId, skip, limit);
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

  async vendorAnalytics(vendorId: string) {
    const totalOrders = await this.orderModel.countDocuments({
      vendorId,
      isDeleted: false,
    });
    const byStatus = await this.orderModel.aggregate([
      { $match: { vendorId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return { vendorId, totalOrders, byStatus };
  }

  async vendorAnalyticsByUser(userId: string) {
    const vendorId = await this.getVendorIdForUser(userId);
    return this.vendorAnalytics(vendorId);
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
    return this.mapOrderResponse(order);
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
      const vendorAllowed = new Set<OrderStatus>([
        OrderStatus.ACCEPTED,
        OrderStatus.DECLINED,
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CANCELLED_BY_VENDOR,
      ]);
      if (!vendorAllowed.has(status)) {
        throw new ForbiddenException('Invalid status update for vendor');
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
      const vendorId = await this.getVendorIdForUser(requester.sub);
      if (order.vendorId !== vendorId) {
        throw new ForbiddenException(
          'You can only assign riders to your orders',
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
      userId: order.userId,
      vendorId: order.vendorId,
      orderReference: order.orderReference,

      items: order.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: item.price,
        name: item.name,
      })),

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
