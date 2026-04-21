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
FoodSchema.index({ vendorId: 1 });
FoodSchema.index({ name: 'text', category: 'text' });
