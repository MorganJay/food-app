import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/Cart.schema';
import { Vendor, VendorDocument } from '../schemas/Vendor.schema';
import { Order, OrderDocument, OrderStatus } from '../schemas/Order.schema';
import { CreateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
  ) {}

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
    return order.save();
  }

  async findById(id: string) {
    const order = await this.orderModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async findByUser(userId: string, skip: number = 0, limit: number = 20) {
    return this.orderModel
      .find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findByVendor(vendorId: string, skip: number = 0, limit: number = 20) {
    return this.orderModel
      .find({ vendorId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
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

  async findByVendorUser(userId: string, skip: number = 0, limit: number = 20) {
    const vendorId = await this.getVendorIdForUser(userId);
    return this.findByVendor(vendorId, skip, limit);
  }

  async findAll(skip: number = 0, limit: number = 20) {
    return this.orderModel
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
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

  async updateStatus(id: string, status: OrderStatus) {
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
    return order;
  }

  async assignRider(orderId: string, riderId: string) {
    const order = await this.orderModel
      .findOneAndUpdate(
        { _id: orderId, isDeleted: false },
        { riderId, status: OrderStatus.OUT_FOR_DELIVERY },
        { new: true },
      )
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    return order;
  }
}
