import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
  PaymentMethod,
  PaymentGateway,
} from '../schemas/Payment.schema';
import { Order, OrderDocument } from '../schemas/Order.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async initialize(
    orderId: string,
    consumerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    currency: string = 'NGN',
    gateway: PaymentGateway = PaymentGateway.PAYSTACK,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }
    const order = await this.orderModel
      .findOne({ _id: orderId, isDeleted: false })
      .exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== consumerId) {
      throw new ForbiddenException('You can only pay for your own orders');
    }
    if (order.total !== amount) {
      throw new BadRequestException('Amount must match the order total');
    }

    const payment = new this.paymentModel({
      orderId,
      consumerId,
      amount,
      currency,
      paymentMethod,
      gateway,
      status: PaymentStatus.PENDING,
    });
    return payment.save();
  }

  async verify(id: string, transactionRef: string, consumerId: string) {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    if (payment.consumerId !== consumerId) {
      throw new ForbiddenException('You cannot verify this payment');
    }
    return this.paymentModel
      .findByIdAndUpdate(
        id,
        { transactionRef, status: PaymentStatus.COMPLETED },
        { new: true },
      )
      .exec();
  }

  async getHistory(consumerId: string, skip: number = 0, limit: number = 20) {
    return this.paymentModel
      .find({ consumerId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getWalletBalance(consumerId: string) {
    return {
      consumerId,
      balance: 0,
      message: 'Wallet balance will be enabled in the next iteration',
    };
  }

  async requestRefund(id: string, consumerId: string) {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    if (payment.consumerId !== consumerId) {
      throw new ForbiddenException(
        'You cannot request a refund for this payment',
      );
    }
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed payments can request refunds',
      );
    }
    return this.paymentModel
      .findByIdAndUpdate(
        id,
        { status: PaymentStatus.REFUND_REQUESTED },
        { new: true },
      )
      .exec();
  }

  async refund(id: string) {
    return this.paymentModel
      .findByIdAndUpdate(id, { status: PaymentStatus.REFUNDED }, { new: true })
      .exec();
  }

  async findById(id: string) {
    const payment = await this.paymentModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }
}
