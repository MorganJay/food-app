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
import { Order, OrderDocument } from '../schemas/Order.schema';
import { OrdersGateway } from '../orders/orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';
import { User, UserDocument } from '../schemas/User.schema';

@Injectable()
export class PaymentsService {
  private readonly paystackBaseUrl: string;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly ordersGateway: OrdersGateway,
    private readonly notificationsService: NotificationsService,
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
    // Fetch the order from DB
    const order = await this.orderModel
      .findOne({ _id: orderId, isDeleted: false })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check ownership
    const orderUserId = order.user?.userId || (order.user as any)?.id;

    if (!orderUserId || orderUserId !== userId) {
      throw new ForbiddenException('You can only pay for your own orders');
    }

    // Ensure order is not already paid
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order has already been paid');
    }

    // Convert Naira to Kobo (Paystack expects whole integer kobo)
    const amountInKobo = Math.round(order.total * 100);

    // Generate unique transaction reference
    const transactionRef = `PAY-${Date.now()}-${order.serialNumber}`;

    // Call Paystack API using native fetch
    let authorizationUrl = '';
    try {
      const response = await fetch(`${this.paystackBaseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: (order.user as any)?.email || 'customer@example.com',
          amount: amountInKobo,
          reference: transactionRef,
          metadata: { orderId, userId },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
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

    // Save local PENDING payment record
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
    // Find local payment record
    const payment = await this.paymentModel
      .findOne({ transactionRef, isDeleted: false })
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Idempotency check: Return immediately if already processed
    if (payment.status === PaymentStatus.COMPLETED) {
      return this.mapPaymentResponse(payment);
    }

    // Direct Server-to-Server call to Paystack using native fetch
    try {
      const response = await fetch(
        `${this.paystackBaseUrl}/transaction/verify/${transactionRef}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new BadRequestException(
          `Paystack verification failed: ${data.message || 'Unknown error'}`,
        );
      }

      const paystackData = data.data;

      // Handle success response
      if (paystackData.status === 'success') {
        payment.status = PaymentStatus.COMPLETED;
        await payment.save();

        const updatedOrder = await this.orderModel.findByIdAndUpdate(
          payment.orderId,
          { paymentStatus: 'paid' },
          { new: true },
        );

        if (updatedOrder) {
          // Trigger WebSocket real-time update
          this.ordersGateway.emitOrderStatus(updatedOrder);
          
          // Fetch Customer User to get real email
          const customerUserId = updatedOrder.user?.userId;
          const customerUser = customerUserId 
            ? await this.userModel.findById(customerUserId).exec() 
            : null;
          const customerEmail = customerUser?.email;
          
          // Trigger email notification safely
          if (customerEmail) {
            try {
              await this.notificationsService.sendEmail({
                to: customerEmail,
                subject: `Payment Confirmed - Order #${updatedOrder.serialNumber || updatedOrder._id}`,
                body: `Your payment of NGN ${Number(updatedOrder.total).toLocaleString()} for order #${updatedOrder.serialNumber || updatedOrder._id} was received successfully!`,
              });
            } catch (error) {
              console.error('Failed to send payment confirmation email:', error);
            }
          }
        }

        return this.mapPaymentResponse(payment);
      } else {
        // Paystack returned failed/abandoned state
        payment.status = PaymentStatus.FAILED;
        await payment.save();

        // Fetch order and customer details for context
        const order = await this.orderModel.findById(payment.orderId).exec();
        const orderRef = order?.serialNumber || order?._id || payment.orderId;
        const amountFormatted = Number(payment.amount).toLocaleString();

        // Send failure notification to Customer
        const customerUserId = order?.user?.userId;
        const customerUser = customerUserId 
          ? await this.userModel.findById(customerUserId).exec() 
          : null;
        const customerEmail = customerUser?.email;

        if (customerEmail) {
          try {
            await this.notificationsService.sendEmail({
              to: customerEmail,
              subject: `Payment Unsuccessful - Order #${orderRef}`,
              body: `Hello,\n\nWe were unable to process your payment of NGN ${amountFormatted} for order #${orderRef}.\n\n` +
                    `Reason: ${paystackData.gateway_response || 'Transaction declined or abandoned'}.\n\n` +
                    `No charges were completed. You can log back into Chopbaze and retry checking out your order.\n\n` +
                    `If you were debited, please reply to this email or contact support@chopbaze.com with your transaction reference: ${payment.transactionRef}.`,
            });
          } catch (error) {
            console.error('Failed to send payment failure email to customer:', error);
          }
        }

        // Notify Support Team
        try {
          await this.notificationsService.sendEmail({
            to: 'support@chopbaze.com',
            subject: `ALERT: Payment Failed for Order #${orderRef}`,
            body: `Hello Support,\n\nA payment attempt failed on Paystack.\n\n` +
                  `Order Reference: #${orderRef}\n` +
                  `Customer Email: ${customerEmail || 'N/A'}\n` +
                  `Amount: NGN ${amountFormatted}\n` +
                  `Reason/Gateway Response: ${paystackData.gateway_response || 'Payment declined or failed'}\n` +
                  `Transaction Ref: ${payment.transactionRef}\n\n` +
                  `Please check the Paystack dashboard if the customer contacts support.`,
          });
        } catch (error) {
          console.error('Failed to send payment failure alert to support:', error);
        }

        throw new BadRequestException('Payment was not successful on Paystack');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const err = error as Error;
      throw new BadRequestException(`Verification failed: ${err.message}`);
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

  async refund(id: string) {
    const updated = await this.paymentModel
      .findByIdAndUpdate(id, { status: PaymentStatus.REFUNDED }, { new: true })
      .exec();

    if (updated) {
      await this.orderModel.findOneAndUpdate(
        { _id: updated.orderId },
        { paymentStatus: 'refunded' },
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

  async handleWebhook(body: any, signature: string) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new BadRequestException('Paystack secret key is not configured');
    }

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      throw new ForbiddenException('Invalid Paystack signature');
    }

    if (body.event === 'charge.success') {
      const transactionRef = body.data?.reference;
      if (transactionRef) {
        await this.verify(transactionRef);
      }
    }

    return { status: 'success' };
  }

  private mapPaymentResponse(payment: any) {
    return {
      id: payment._id.toString(),
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