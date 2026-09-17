import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type RestaurantDocument = HydratedDocument<Restaurant>;

@Schema({ timestamps: true })
export class Restaurant extends BaseEntity {
  @Prop({ unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  vendorId: string;

  @Prop({
    type: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    required: true,
  })
  bannerImage: {
    secure_url: string;
    public_id: string;
  };

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number],
  })
  location: {
    type: string;
    coordinates: number[];
  };

  @Prop()
  address: string;

  @Prop({ type: [String], default: [] })
  workingDays: string[];

  @Prop()
  orderType: string;

  @Prop()
  openHours: string;

  @Prop()
  closeHours: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'restaurants' },
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
RestaurantSchema.index({ location: '2dsphere' });
RestaurantSchema.index({ name: 'text', description: 'text' });
