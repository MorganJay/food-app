import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, BadRequestException } from '@nestjs/common';

import { Otp, OtpDocument } from '../schemas/Otp.schema';

@Injectable()
export class OtpService {
  constructor(@InjectModel(Otp.name) private otpModel: Model<OtpDocument>) {}

  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async doesPhoneWithOtpExist(phone: string, code: string): Promise<boolean> {
    const otpRecord = await this.otpModel.findOne({ phone, code });
    return !!otpRecord;
  }

  async create(phone: string) {
    const code = this.generateCode();
    await this.otpModel.create({
      phone,
      code,
      expiresAt: new Date(),
    });
    return code;
  }

  async verify(phone: string, code: string) {
    const doc = await this.otpModel
      .findOne({ phone, code, consumed: false })
      .exec();
    if (!doc) throw new BadRequestException('Invalid or expired code');

    // optional: check createdAt or expiresAt manually
    doc.consumed = true;
    await doc.save();
    return true;
  }

  async lastSentWithin(phone: string, seconds: number) {
    const since = new Date(Date.now() - seconds * 1000);
    const recent = await this.otpModel.findOne({
      phone,
      createdAt: { $gte: since },
    });
    return !!recent;
  }
}
