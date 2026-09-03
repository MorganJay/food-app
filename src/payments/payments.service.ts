import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
  PaymentMethod,
  PaymentGateway,
} from '../schemas/Payment.schema';
import { Order, OrderDocument, OrderStatus } from '../schemas/Order.schema';
import { OrderEventsService } from '../orders/order-events.service';
import * as crypto from 'crypto';
import { User, UserDocument } from '../schemas/User.schema';

@Injectable()
export class PaymentsService {
  private readonly paystackBaseUrl: string;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly orderEvents: OrderEventsService,
    private readonly configService: ConfigService,
  ) {
    this.paystackBaseUrl = this.configService.get<string>(
      'PAYSTACK_BASE_URL',
      'https://api.paystack.co',
    );
  }

  async initialize(
    orderId: string,
    userId: string,
    paymentMethod: PaymentMethod,
    gateway: PaymentGateway = PaymentGateway.PAYSTACK,
  ) {
    const order = await this.orderModel
      .findOne({ _id: orderId, isDeleted: false })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderUserId = order.user?.userId || (order.user as any)?.id;

    if (!orderUserId || orderUserId !== userId) {
      throw new ForbiddenException('You can only pay for your own orders');
    }

    if (
      order.status === OrderStatus.CANCELLED_BY_CONSUMER ||
      order.status === OrderStatus.CANCELLED_BY_VENDOR
    ) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order has already been paid');
    }

    // PREVENT RACE CONDITION: Check if a payment initialization is already pending
    const existingPendingPayment = await this.paymentModel
      .findOne({ orderId, status: PaymentStatus.PENDING, isDeleted: false })
      .exec();

    if (existingPendingPayment) {
      throw new BadRequestException(
        'A payment is already pending for this order. Please complete or cancel it first.',
      );
    }

    // Fetch email with fallback
    let userEmail = order.user?.email || (order.user as any)?.userEmail;
    if (!userEmail) {
      const user = await this.userModel.findById(userId).select('email').exec();
      userEmail = user?.email;
    }

    if (!userEmail) {
      throw new BadRequestException('Valid user email is required to process payment');
    }

    const amountInKobo = Math.round(order.total * 100);
    const transactionRef = `PAY-${Date.now()}-${order.serialNumber}`;
    let authorizationUrl = '';

    try {
      const response = await fetch(`${this.paystackBaseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.configService.get<string>('PAYSTACK_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          amount: amountInKobo,
          reference: transactionRef,
          metadata: { orderId, userId },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new BadRequestException(
          `Paystack initialization failed: ${data.message || 'Unknown error'}`,
        );
      }

      authorizationUrl = data.data.authorization_url;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const err = error as Error;
      throw new BadRequestException(`Paystack initialization failed: ${err.message}`);
    }

    const payment = new this.paymentModel({
      orderId,
      userId: orderUserId,
      amount: order.total,
      currency: 'NGN',
      paymentMethod,
      gateway,
      transactionRef,
      status: PaymentStatus.PENDING,
    });

    const savedPayment = await payment.save();

    return {
      ...this.mapPaymentResponse(savedPayment),
      authorizationUrl,
    };
  }

  async verify(transactionRef: string) {
    // Fetch payment
    const payment = await this.paymentModel
      .findOne({ transactionRef, isDeleted: false })
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Immediate return if already processed
    if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.FAILED) {
      return this.mapPaymentResponse(payment);
    }

    try {
      const response = await fetch(
        `${this.paystackBaseUrl}/transaction/verify/${transactionRef}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('PAYSTACK_SECRET_KEY')}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new BadRequestException(
          `Paystack verification failed: ${data.message || 'Unknown error'}`,
        );
      }

      const paystackData = data.data;

      if (paystackData.status === 'success') {
        const expectedAmountInKobo = Math.round(payment.amount * 100);
        
        // Strict security assertions
        if (paystackData.amount !== expectedAmountInKobo) {
          await this.markPaymentFailed(payment, 'Amount mismatch');
          throw new BadRequestException('Transaction amount mismatch');
        }

        if (paystackData.currency !== 'NGN') {
          await this.markPaymentFailed(payment, 'Currency mismatch');
          throw new BadRequestException('Transaction currency mismatch');
        }

        // ATOMIC UPDATE: Prevents concurrent race conditions (Webhook vs Client redirect)
        const updatedPayment = await this.paymentModel.findOneAndUpdate(
          { _id: payment._id, status: PaymentStatus.PENDING },
          { status: PaymentStatus.COMPLETED },
          { new: true },
        );

        // If updatedPayment is null, another request (e.g. Webhook) already processed it
        if (!updatedPayment) {
          const freshPayment = await this.paymentModel.findById(payment._id);
          return this.mapPaymentResponse(freshPayment);
        }

        const updatedOrder = await this.orderModel.findByIdAndUpdate(
          payment.orderId,
          { paymentStatus: 'paid' },
          { new: true },
        );

        if (updatedOrder) {
          await this.orderEvents.publish({
            type: 'OrderPlacedEvent',
            orderId: updatedOrder._id.toString(),
            order: updatedOrder.toObject(),
          });
        }

        return this.mapPaymentResponse(updatedPayment);
      } else {
        await this.markPaymentFailed(payment, 'Paystack transaction failed');
        throw new BadRequestException('Payment was not successful on Paystack');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const err = error as Error;
      throw new BadRequestException(`Verification failed: ${err.message}`);
    }
  }

  private async markPaymentFailed(payment: PaymentDocument, reason: string) {
    payment.status = PaymentStatus.FAILED;
    await payment.save();

    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      payment.orderId,
      {
        paymentStatus: 'failed',
        status: OrderStatus.CANCELLED_BY_CONSUMER,
      },
      { new: true },
    );

    if (updatedOrder) {
      await this.orderEvents.publish({
        type: 'OrderCancelledEvent',
        orderId: updatedOrder._id.toString(),
        order: updatedOrder.toObject(),
      });
    }
  }

  async getHistory(userId: string, skip: number = 0, limit: number = 20) {
    const payments = await this.paymentModel
      .find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return payments.map((payment) => this.mapPaymentResponse(payment));
  }

  async getWalletBalance(userId: string) {
    return {
      userId,
      balance: 0,
      message: 'Wallet balance will be enabled in the next iteration',
    };
  }

  async requestRefund(id: string, userId: string) {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    if (payment.userId !== userId) {
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

  async refund(id: string, amount?: number, merchantNote?: string) {
    const payment = await this.paymentModel.findById(id).exec();

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.REFUND_REQUESTED) {
      throw new BadRequestException(
        `Cannot refund a payment with status: ${payment.status}`,
      );
    }

    const refundPayload: Record<string, any> = {
      transaction: payment.transactionRef,
    };

    if (amount) {
      refundPayload.amount = Math.round(amount * 100);
    }

    if (merchantNote) {
      refundPayload.merchant_note = merchantNote;
    }

    try {
      const response = await fetch(`${this.paystackBaseUrl}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new BadRequestException(
          `Paystack refund failed: ${data.message || 'Unknown error'}`,
        );
      }

      payment.status = PaymentStatus.REFUNDED;
      const updatedPayment = await payment.save();

      const updatedOrder = await this.orderModel
        .findOneAndUpdate(
          { _id: payment.orderId },
          { paymentStatus: 'refunded' },
          { new: true },
        )
        .exec();

      if (updatedOrder) {
        await this.orderEvents.publish({
          type: 'OrderRefundedEvent',
          orderId: updatedOrder._id.toString(),
          order: updatedOrder.toObject(),
        });
      }

      return this.mapPaymentResponse(updatedPayment);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const err = error as Error;
      throw new BadRequestException(`Refund execution failed: ${err.message}`);
    }
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

  async cancelByReference(reference: string, userId: string) {
    const payment = await this.paymentModel
      .findOne({ transactionRef: reference, isDeleted: false })
      .exec();

    if (!payment) {
      throw new NotFoundException(
        `Payment record with reference ${reference} not found`,
      );
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own payments');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel payment with current status: ${payment.status}`,
      );
    }

    payment.status = PaymentStatus.FAILED;
    const updatedPayment = await payment.save();

    const updatedOrder = await this.orderModel
      .findOneAndUpdate(
        { _id: payment.orderId },
        {
          paymentStatus: 'failed',
          status: OrderStatus.CANCELLED_BY_CONSUMER,
        },
        { new: true },
      )
      .exec();

    if (updatedOrder) {
      await this.orderEvents.publish({
        type: 'OrderCancelledEvent',
        orderId: updatedOrder._id.toString(),
        order: updatedOrder.toObject(),
      });
    }

    return this.mapPaymentResponse(updatedPayment);
  }

  async handleWebhook(body: any, signature: string, rawBody?: Buffer) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new BadRequestException('Paystack secret key is not configured');
    }

    const payloadToHash = rawBody 
      ? rawBody.toString('utf-8') 
      : JSON.stringify(body);

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(payloadToHash)
      .digest('hex');

    if (hash !== signature) {
      throw new ForbiddenException('Invalid Paystack signature');
    }

    const event = body.event;
    const eventData = body.data;

    if (event === 'charge.success' || event === 'charge.failed') {
      const transactionRef = eventData?.reference;
      if (transactionRef) {
        const existingPayment = await this.paymentModel.findOne({
          transactionRef,
          isDeleted: false,
        });

        if (
          existingPayment &&
          (existingPayment.status === PaymentStatus.COMPLETED ||
            existingPayment.status === PaymentStatus.FAILED)
        ) {
          return { status: 'success' };
        }

        try {
          await this.verify(transactionRef);
        } catch (error) {
          console.log(`Webhook handled event ${event} for ref: ${transactionRef}`);
        }
      }
    }

    if (event === 'refund.processed') {
      const transactionRef = eventData?.transaction_reference || eventData?.transaction?.reference;

      if (transactionRef) {
        const payment = await this.paymentModel.findOne({
          transactionRef,
          isDeleted: false,
        });

        if (payment && payment.status !== PaymentStatus.REFUNDED) {
          payment.status = PaymentStatus.REFUNDED;
          await payment.save();

          const updatedOrder = await this.orderModel.findOneAndUpdate(
            { _id: payment.orderId },
            { paymentStatus: 'refunded' },
            { new: true },
          ).exec();

          if (updatedOrder) {
            await this.orderEvents.publish({
              type: 'OrderRefundedEvent',
              orderId: updatedOrder._id.toString(),
              order: updatedOrder.toObject(),
            });
          }
        }
      }
    }

    if (event === 'refund.failed') {
      const transactionRef = eventData?.transaction_reference || eventData?.transaction?.reference;
      console.error(`Paystack refund failed for transaction ref: ${transactionRef}. Reason: ${eventData?.reason || 'Unknown'}`);
    }

    return { status: 'success' };
  }

  private mapPaymentResponse(payment: any) {
    return {
      id: payment._id?.toString() || payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
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