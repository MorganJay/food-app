import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type DeliveryDocument = HydratedDocument<Delivery>;

export enum DeliveryStatus {
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Delivery extends BaseEntity {
  @Prop({ required: true, index: true })
  orderId: string;

  @Prop()
  driverId: string;

  @Prop({ enum: DeliveryStatus, default: DeliveryStatus.ASSIGNED })
  status: DeliveryStatus;

  @Prop({ type: Object })
  currentLocation: {
    latitude: number;
    longitude: number;
  };

  @Prop({ required: true })
  destinationAddress: string;

  @Prop()
  estimatedDeliveryTime: Date;

  @Prop()
  actualDeliveryTime: Date;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);

DeliverySchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'deliveries' },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      this.serialNumber = counter.value?.value || 1;
    } catch (error) {
      console.error('Error auto-incrementing serialNumber:', error);
    }
  }
  next();
});
DeliverySchema.index({ driverId: 1 });
