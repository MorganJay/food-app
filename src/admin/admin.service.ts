import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/User.schema';
import { Vendor, VendorDocument } from '../schemas/Vendor.schema';
import { Payment, PaymentDocument } from '../schemas/Payment.schema';
import { Rider, RiderDocument } from '../schemas/Rider.schema';
import { Order, OrderDocument } from '../schemas/Order.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Rider.name) private riderModel: Model<RiderDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async getAllUsers(skip: number = 0, limit: number = 20) {
    return this.userModel.find({}).skip(skip).limit(limit).exec();
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    return this.userModel
      .findByIdAndUpdate(userId, { isActive }, { new: true })
      .exec();
  }

  async getPendingVendors(skip: number = 0, limit: number = 20) {
    return this.vendorModel
      .find({ isVerified: false })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async verifyVendor(vendorId: string) {
    return this.vendorModel
      .findByIdAndUpdate(vendorId, { isVerified: true }, { new: true })
      .exec();
  }

  async getOnlineRiders() {
    return this.riderModel.find({ isOnline: true }).exec();
  }

  async getAllPayments(skip: number = 0, limit: number = 20) {
    return this.paymentModel
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async refundPayment(paymentId: string) {
    return this.paymentModel
      .findByIdAndUpdate(paymentId, { status: 'refunded' }, { new: true })
      .exec();
  }

  async getAllOrders(skip: number = 0, limit: number = 20) {
    return this.orderModel
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getOrderAnalytics() {
    const totalOrders = await this.orderModel.countDocuments({
      isDeleted: false,
    });
    const byStatus = await this.orderModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const totalRevenueResult = await this.orderModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]);
    return {
      totalOrders,
      revenue: totalRevenueResult[0]?.revenue ?? 0,
      byStatus,
    };
  }

  async deleteUser(userId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );
  }
}
