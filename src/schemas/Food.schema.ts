import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type FoodDocument = HydratedDocument<Food>;

@Schema({ timestamps: true })
export class Food extends BaseEntity {
  @Prop({ required: true })
  vendorId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 'available' })
  status: string;

  @Prop()
  category: string;

  @Prop({ default: 0 })
  prepTime: number;

  @Prop({ default: 0 })
  avgRating: number;

  @Prop({ default: 0 })
  reviewsCount: number;

  @Prop()
  image: string;
}

export const FoodSchema = SchemaFactory.createForClass(Food);

FoodSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'foods' },
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
FoodSchema.index({ vendorId: 1 });
FoodSchema.index({ name: 'text', category: 'text' });
