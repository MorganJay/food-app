import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseEntity } from './BaseEntity';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  PREPARING = 'preparing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED_BY_CONSUMER = 'cancelled_by_consumer',
  CANCELLED_BY_VENDOR = 'cancelled_by_vendor',
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

@Schema({ timestamps: true })
export class Order extends BaseEntity {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  vendorId: string;

  @Prop({
    type: [
      {
        productId: Types.ObjectId,
        quantity: Number,
        price: Number,
        name: String,
      },
    ],
    required: true,
  })
  items: OrderItem[];

  @Prop({
    default: () =>
      `ORD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  })
  orderReference: string;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  deliveryAddress: string;

  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop()
  notes: string;

  @Prop()
  riderId: string;

  @Prop({ default: 'pending' })
  paymentStatus: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1 });
OrderSchema.index({ vendorId: 1 });
OrderSchema.index({ status: 1 });
