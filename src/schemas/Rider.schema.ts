import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type RiderDocument = HydratedDocument<Rider>;

@Schema({ timestamps: true })
export class Rider extends BaseEntity {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  vehicleType: string;

  @Prop({ required: true })
  plateNumber: string;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
      timestamp: Date,
    },
  })
  currentGeolocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
}

export const RiderSchema = SchemaFactory.createForClass(Rider);

RiderSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'riders' },
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
