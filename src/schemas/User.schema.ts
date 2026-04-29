import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  CONSUMER = 'consumer',
  VENDOR = 'vendor',
  ADMIN = 'admin',
  RIDER = 'rider',
}

@Schema({ timestamps: true })
export class User extends BaseEntity {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ required: true })
  role: UserRole;

  @Prop({
    unique: true,
    default: () =>
      `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  })
  referralCode: string;

  @Prop()
  referredBy: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  password?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'users' },
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
