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
    paymentMethod: PaymentMethod,
    gateway: PaymentGateway = PaymentGateway.PAYSTACK,
  ) {
    const order = await this.orderModel
      .findOne({ _id: orderId, isDeleted: false })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== consumerId) { 
      throw new ForbiddenException('You can only pay for your own orders'); 
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order has already been paid for');
    }

    const existingPayment = await this.paymentModel.findOne({
      orderId,
      status: {
        $in: [PaymentStatus.PENDING, PaymentStatus.COMPLETED],
      },
    });

    if (existingPayment) {
      throw new BadRequestException(
        'A payment already exists for this order',
      );
    }

    const amount = order.total;

    if (amount <= 0) {
      throw new BadRequestException('Invalid order amount');
    }

    // Clean transaction ref incorporating order data for tracking
    const transactionRef = `PAY-${Date.now()}-${order.serialNumber}`;

    const payment = new this.paymentModel({
      orderId,
      consumerId: order.userId,
      amount,
      currency: 'NGN',
      paymentMethod,
      gateway,
      transactionRef,
      status: PaymentStatus.PENDING,
    });

    const savedPayment = await payment.save();
    return this.mapPaymentResponse(savedPayment);
  }

  async verify(id: string, transactionRef: string, consumerId: string) {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    if (payment.consumerId !== consumerId) {
      throw new ForbiddenException('You cannot verify this payment');
    }
    if (payment.transactionRef !== transactionRef) {
      throw new BadRequestException('Transaction reference mismatch');
    }
    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment already completed');
    }

    // update payment and mark corresponding order as paid
    const updated = await this.paymentModel
      .findByIdAndUpdate(
        id,
        { status: PaymentStatus.COMPLETED },
        { new: true },
      )
      .exec();

    await this.orderModel.findOneAndUpdate(
      { _id: payment.orderId },
      { paymentStatus: 'paid' }
    ).exec();

    return this.mapPaymentResponse(updated);
  }

  async getHistory(consumerId: string, skip: number = 0, limit: number = 20) {
    const payments = await this.paymentModel
      .find({ consumerId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return payments.map((payment) => this.mapPaymentResponse(payment));
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
    const updated = await this.paymentModel
      .findByIdAndUpdate(
        id,
        { status: PaymentStatus.REFUND_REQUESTED },
        { new: true },
      )
      .exec();
    return this.mapPaymentResponse(updated);
  }

  async refund(id: string) {
    const updated = await this.paymentModel
      .findByIdAndUpdate(id, { status: PaymentStatus.REFUNDED }, { new: true })
      .exec();

    // Reflect refund back to order details
    if (updated) {
      await this.orderModel.findOneAndUpdate(
        { _id: updated.orderId },
        { paymentStatus: 'refunded' }
      ).exec();
    }

    return this.mapPaymentResponse(updated);
  }

  async findById(id: string) {
    const payment = await this.paymentModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return this.mapPaymentResponse(payment);
  }

  private mapPaymentResponse(payment: any) {
    return {
      id: payment._id.toString(),
      orderId: payment.orderId,
      consumerId: payment.consumerId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      gateway: payment.gateway,
      transactionRef: payment.transactionRef,
      status: payment.status,
      serialNumber: payment.serialNumber,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}