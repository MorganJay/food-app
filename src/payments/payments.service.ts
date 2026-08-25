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
import { OrdersGateway } from '../orders/orders.gateway';
// TODO: Re-enable NotificationsService when email delivery setup is ready
// import { NotificationsService } from '../notifications/notifications.service';
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
    // private readonly notificationsService: NotificationsService,
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

    // Fetch user details to get the actual registered email address
    const user = await this.userModel.findById(userId).exec();

    if (!user || !user.email) {
      throw new BadRequestException('Valid user email is required to process payment');
    }
    
    try {
      const response = await fetch(`${this.paystackBaseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
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

    // Idempotency check: Return immediately if already processed (COMPLETED or FAILED)
    if (
      payment.status === PaymentStatus.COMPLETED ||
      payment.status === PaymentStatus.FAILED
    ) {
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
        // Amount check: Ensure amount paid matches expected total in Kobo
        const expectedAmountInKobo = Math.round(payment.amount * 100);
        if (paystackData.amount !== expectedAmountInKobo) {
          payment.status = PaymentStatus.FAILED;
          await payment.save();
          throw new BadRequestException('Transaction amount mismatch');
        }

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

          /* TODO: Re-enable success notification email
          const customerUserId = updatedOrder.user?.userId;
          const customerUser = customerUserId
            ? await this.userModel.findById(customerUserId).exec()
            : null;
          const customerEmail = customerUser?.email;

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
          */
        }

        return this.mapPaymentResponse(payment);
      } else {
        // Paystack returned failed/abandoned state
        payment.status = PaymentStatus.FAILED;
        await payment.save();

        // Mark order payment as failed and update order status to cancelled
        const updatedOrder = await this.orderModel.findByIdAndUpdate(
          payment.orderId,
          {
            paymentStatus: 'failed',
            status: OrderStatus.CANCELLED_BY_CONSUMER,
          },
          { new: true },
        );

        if (updatedOrder) {
          // Broadcast status change via WebSockets
          this.ordersGateway.emitOrderStatus(updatedOrder);
        }

        /* TODO: Re-enable failure notification emails to Customer & Support
        const order = await this.orderModel.findById(payment.orderId).exec();
        const orderRef = order?.serialNumber || order?._id || payment.orderId;
        const amountFormatted = Number(payment.amount).toLocaleString();

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
              body:
                `Hello,\n\nWe were unable to process your payment of NGN ${amountFormatted} for order #${orderRef}.\n\n` +
                `Reason: ${paystackData.gateway_response || 'Transaction declined or abandoned'}.\n\n` +
                `No charges were completed. You can log back into Chopbaze and retry checking out your order.\n\n` +
                `If you were debited, please reply to this email or contact support@chopbaze.com with your transaction reference: ${payment.transactionRef}.`,
            });
          } catch (error) {
            console.error('Failed to send payment failure email to customer:', error);
          }
        }

        try {
          await this.notificationsService.sendEmail({
            to: 'support@chopbaze.com',
            subject: `ALERT: Payment Failed for Order #${orderRef}`,
            body:
              `Hello Support,\n\nA payment attempt failed on Paystack.\n\n` +
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
        */

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

  async refund(id: string, amount?: number, merchantNote?: string) {
    // Fetch payment record from DB
    const payment = await this.paymentModel.findById(id).exec();

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Guard: Only completed payments can be refunded
    if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.REFUND_REQUESTED) {
      throw new BadRequestException(
        `Cannot refund a payment with status: ${payment.status}`,
      );
    }

    // Prepare payload for Paystack API (Amount must be in Kobo if partial refund)
    const refundPayload: Record<string, any> = {
      transaction: payment.transactionRef,
    };

    if (amount) {
      refundPayload.amount = Math.round(amount * 100);
    }

    if (merchantNote) {
      refundPayload.merchant_note = merchantNote;
    }

    // Call Paystack /refund API
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

      // Update local Payment record state
      payment.status = PaymentStatus.REFUNDED;
      const updatedPayment = await payment.save();

      // Sync Order payment state
      const updatedOrder = await this.orderModel
        .findOneAndUpdate(
          { _id: payment.orderId },
          { paymentStatus: 'refunded' },
          { new: true },
        )
        .exec();

      if (updatedOrder) {
        // Broadcast update via WebSockets
        this.ordersGateway.emitOrderStatus(updatedOrder);

        /* TODO: Re-enable refund notification email
        const customerUserId = updatedOrder.user?.userId;
        const customerUser = customerUserId
          ? await this.userModel.findById(customerUserId).exec()
          : null;
        const customerEmail = customerUser?.email;

        if (customerEmail) {
          try {
            const refundedAmountFormatted = Number(amount || payment.amount).toLocaleString();
            await this.notificationsService.sendEmail({
              to: customerEmail,
              subject: `Refund Processed - Order #${updatedOrder.serialNumber || updatedOrder._id}`,
              body:
                `Hello,\n\nA refund of NGN ${refundedAmountFormatted} for order #${updatedOrder.serialNumber || updatedOrder._id} has been initiated on Paystack.\n\n` +
                `Transaction Reference: ${payment.transactionRef}\n\n` +
                `Please allow 3 to 15 business days for the funds to reflect back in your account/card depending on your bank.`,
            });
          } catch (error) {
            console.error('Failed to send refund notification email:', error);
          }
        }
        */
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
      this.ordersGateway.emitOrderStatus(updatedOrder);
    }

    return this.mapPaymentResponse(updatedPayment);
  }

  async handleWebhook(body: any, signature: string, rawBody?: Buffer) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new BadRequestException('Paystack secret key is not configured');
    }

    // Convert rawBody Buffer to UTF-8 String explicitly
    const payloadToHash = rawBody 
    ? rawBody.toString('utf-8') 
    : JSON.stringify(body);

    // Verify HMAC SHA512 Signature
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(payloadToHash)
      .digest('hex');

    if (hash !== signature) {
      throw new ForbiddenException('Invalid Paystack signature');
    }

    const event = body.event;
    const eventData = body.data;

    // Handle Charge Events (success / failed)
    if (event === 'charge.success' || event === 'charge.failed') {
      const transactionRef = eventData?.reference;
      if (transactionRef) {
        // Pre-check DB state: Ignore duplicate webhooks if payment was already processed
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

    // Handle Successful Refund Event
    if (event === 'refund.processed') {
      const transactionRef = eventData?.transaction_reference || eventData?.transaction?.reference;

      if (transactionRef) {
        const payment = await this.paymentModel.findOne({
          transactionRef,
          isDeleted: false,
        });

        // Idempotency check: Skip if already marked as REFUNDED
        if (payment && payment.status !== PaymentStatus.REFUNDED) {
          payment.status = PaymentStatus.REFUNDED;
          await payment.save();

          // Sync Order status
          const updatedOrder = await this.orderModel.findOneAndUpdate(
            { _id: payment.orderId },
            { paymentStatus: 'refunded' },
            { new: true },
          ).exec();

          if (updatedOrder) {
            // Emit WebSocket event
            this.ordersGateway.emitOrderStatus(updatedOrder);

            /* TODO: Re-enable refund settlement notification email
            const customerUserId = updatedOrder.user?.userId;
            const customerUser = customerUserId
              ? await this.userModel.findById(customerUserId).exec()
              : null;
            const customerEmail = customerUser?.email;

            if (customerEmail) {
              try {
                const refundedAmount = eventData.amount
                  ? Number(eventData.amount / 100).toLocaleString()
                  : Number(payment.amount).toLocaleString();

                await this.notificationsService.sendEmail({
                  to: customerEmail,
                  subject: `Refund Settled - Order #${updatedOrder.serialNumber || updatedOrder._id}`,
                  body:
                    `Hello,\n\nYour refund of NGN ${refundedAmount} for order #${updatedOrder.serialNumber || updatedOrder._id} has been fully processed by Paystack.\n\n` +
                    `Transaction Reference: ${payment.transactionRef}\n\n` +
                    `The funds should now reflect in your bank account or card balance within 3 to 15 business days depending on your bank.`,
                });
              } catch (error) {
                console.error('Failed to send refund settlement email:', error);
              }
            }
            */
          }
        }
      }
    }

    // Handle Failed Refund Event (Optional Alert)
    if (event === 'refund.failed') {
      const transactionRef = eventData?.transaction_reference || eventData?.transaction?.reference;
      console.error(`Paystack refund failed for transaction ref: ${transactionRef}. Reason: ${eventData?.reason || 'Unknown'}`);

      /* TODO: Re-enable support email alert for failed refunds
      try {
        await this.notificationsService.sendEmail({
          to: 'support@chopbaze.com',
          subject: `ALERT: Refund Failed for Ref #${transactionRef}`,
          body:
            `Hello Support,\n\nA refund attempt failed on Paystack.\n\n` +
            `Transaction Ref: ${transactionRef}\n` +
            `Reason: ${eventData?.reason || 'Paystack refund failure'}\n\n` +
            `Please log into your Paystack Dashboard to resolve this issue manually.`,
        });
      } catch (error) {
        console.error('Failed to send refund failure alert email:', error);
      }
      */
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