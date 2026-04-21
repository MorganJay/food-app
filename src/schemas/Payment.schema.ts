import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUND_REQUESTED = 'refund_requested',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  WALLET = 'wallet',
  CARD = 'card',
  TRANSFER = 'transfer',
}

export enum PaymentGateway {
  PAYSTACK = 'paystack',
}

@Schema({ timestamps: true })
export class Payment extends BaseEntity {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  consumerId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'NGN' })
  currency: string;

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop({
    required: true,
    enum: PaymentGateway,
    default: PaymentGateway.PAYSTACK,
  })
  gateway: PaymentGateway;

  @Prop()
  transactionRef: string;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ consumerId: 1 });
