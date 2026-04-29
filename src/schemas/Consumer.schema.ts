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

ConsumerSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'consumers' },
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
