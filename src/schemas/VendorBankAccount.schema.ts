import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { BaseEntity } from './BaseEntity';

export type VendorBankAccountDocument =
  HydratedDocument<VendorBankAccount>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class VendorBankAccount extends BaseEntity {
  @Prop({ required: true, index: true })
  vendorId: string;

  @Prop({ required: true, trim: true })
  accountName: string;

  @Prop({ required: true, trim: true })
  accountNumber: string;

  @Prop({ required: true, trim: true })
  bankName: string;

  @Prop({ trim: true })
  bankCode?: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export const VendorBankAccountSchema = SchemaFactory.createForClass(VendorBankAccount);

VendorBankAccountSchema.index({ vendorId: 1 });
VendorBankAccountSchema.index({ vendorId: 1, isDefault: 1 });

VendorBankAccountSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'vendor-bank-accounts' },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      this.serialNumber = counter.value || 1;
    } catch (error) {
      console.error('Error auto-incrementing serialNumber:', error);
    }
  }
  next();
})
