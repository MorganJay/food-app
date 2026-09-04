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

export interface SelectedChoice {
  groupName: string;
  name: string;
  price: number;
}

export interface OrderItemImage {
  url: string;
  publicId?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  subtotal: number;
  image?: OrderItemImage;
  selectedChoices?: SelectedChoice[];
}

export class OrderUser {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;
}

@Schema({ timestamps: true })
export class Order extends BaseEntity {
  @Prop({ required: true })
  restaurantId: string;

  @Prop({ type: OrderUser, required: true })
  user: OrderUser;

  @Prop({
    type: [
      {
        productId: { type: Types.ObjectId, ref: 'Product' },
        quantity: Number,
        price: Number,
        name: String,
        subtotal: { type: Number, default: 0 },
        image: {
          type: {
            url: String,
            publicId: String,
          },
          _id: false,
          required: false,
        },
        selectedChoices: {
          type: [
            {
              groupName: { type: String, trim: true },
              name: { type: String, trim: true },
              price: { type: Number, default: 0 },
            },
          ],
          _id: false,
          default: [],
        },
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

  @Prop({ default: 0 })
  serviceFee: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true, type: Object })
  deliveryAddress: any;

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
OrderSchema.index({ restaurantId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'user.userId': 1 });

OrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'orders' },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      this.serialNumber = counter.value || 1;
    } catch (error) {
      console.error('Error auto-incrementing serialNumber:', error);
    }
  }
  next();
});