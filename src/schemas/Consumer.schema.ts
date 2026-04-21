import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type ConsumerDocument = HydratedDocument<Consumer>;

@Schema({ timestamps: true })
export class Consumer extends BaseEntity {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ type: [String], default: [] })
  favorites: string[];

  @Prop({ type: [String], default: [] })
  orderHistory: string[];
}

export const ConsumerSchema = SchemaFactory.createForClass(Consumer);
