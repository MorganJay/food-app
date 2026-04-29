import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseEntity } from './BaseEntity';

export type CartDocument = HydratedDocument<Cart>;

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

@Schema({ timestamps: true })
export class Cart extends BaseEntity {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    type: [
      {
        productId: Types.ObjectId,
        quantity: Number,
        price: Number,
        name: String,
      },
    ],
    default: [],
  })
  items: CartItem[];

  @Prop()
  vendorId?: string;

  @Prop({ default: 0 })
  total: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
