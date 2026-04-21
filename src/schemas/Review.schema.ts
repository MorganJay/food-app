import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review extends BaseEntity {
  @Prop({ required: true })
  consumerId: string;

  @Prop({ required: true })
  vendorId: string;

  @Prop()
  foodId: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment: string;

  @Prop({
    type: [
      {
        vendorId: String,
        reason: String,
        createdAt: Date,
      },
    ],
    default: [],
  })
  reports: Array<{ vendorId: string; reason: string; createdAt: Date }>;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ consumerId: 1 });
ReviewSchema.index({ vendorId: 1 });
ReviewSchema.index({ foodId: 1 });
