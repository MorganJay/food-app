import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ required: true })
  code: string;

  @Prop({
    required: true,
    default: Date.now,
    expires: 600, // 10 minutes
  })
  expiresAt: Date;

  @Prop({ default: false })
  consumed: boolean;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// alternatively, you can also set index manually:
// OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });
