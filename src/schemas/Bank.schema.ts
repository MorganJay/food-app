import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseEntity } from './BaseEntity';

export type BankDocument = Bank & Document;

@Schema({ timestamps: true })
export class Bank extends BaseEntity {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true })
  code: string; // The Paystack routing code (e.g., '058', '011')

  @Prop({ default: false })
  isDeleted: boolean;
}

export const BankSchema = SchemaFactory.createForClass(Bank);

BankSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.model('Bank').db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'banks' },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      this.serialNumber = counter ? counter.value : 1;
    } catch (error) {
      console.error('Error auto-incrementing serialNumber for Bank:', error);
    }
  }
  next();
});