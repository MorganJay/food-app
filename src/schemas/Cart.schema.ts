import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseEntity } from './BaseEntity';

export type CartDocument = HydratedDocument<Cart>;

export interface SelectedChoice {
  groupName: string;
  name: string;
  price: number;
}

// Added optional image structure for the frontend UI
export interface CartItemImage {
  url: string;
  publicId?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  subtotal: number;
  image?: CartItemImage;
  selectedChoices?: SelectedChoice[];
}

@Schema({ timestamps: true })
export class Cart extends BaseEntity {
  @Prop({ required: true, index: true })
  userId: string;

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
              groupName: String,
              name: String,
              price: Number,
            },
          ],
          _id: false,
          default: [],
        },
      },
    ],
    default: [],
  })
  items: CartItem[];

  @Prop()
  restaurantId?: string;

  @Prop({ default: 0 })
  total: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'carts' },
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