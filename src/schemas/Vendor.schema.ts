import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type VendorDocument = HydratedDocument<Vendor>;

@Schema({ timestamps: true })
export class Vendor extends BaseEntity {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  businessName: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number],
  })
  location: {
    type: string;
    coordinates: number[];
  };

  @Prop({ required: true })
  openHours: string;

  @Prop({ required: true })
  closeHours: string;

  @Prop({ default: 0 })
  avgRating: number;

  @Prop({ default: 0 })
  reviewsCount: number;

  @Prop({ default: false })
  isVerified: boolean;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
VendorSchema.index({ location: '2dsphere' });

VendorSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'vendors' },
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
