import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type DeliveryAddressDocument = HydratedDocument<DeliveryAddress>;

@Schema({ timestamps: true })
export class DeliveryAddress extends BaseEntity {
  @Prop({ required: true, index: true })
  consumerId: string;

  @Prop({ required: true })
  label: string; // e.g., Home, Work

  @Prop({ required: true })
  addressLine: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  postalCode: string;

  @Prop()
  country: string;

  @Prop({ type: Object })
  location: { lat?: number; lng?: number };

  @Prop()
  instructions: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export const DeliveryAddressSchema =
  SchemaFactory.createForClass(DeliveryAddress);

DeliveryAddressSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'delivery-address' },
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