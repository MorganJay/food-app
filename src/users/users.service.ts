import { Model } from 'mongoose';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';

import { RegisterDto } from '../auth/dto/register.dto';
import { User, UserDocument } from '../schemas/User.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  private hashPassword(password: string) {
    return createHash('sha256').update(password).digest('hex');
  }

  private generateReferralCode() {
    return `REF-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async findOne(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async upsertByPhoneNumber(phoneNumber: string, dto: RegisterDto) {
    console.log("From inside upsertByPhoneNumber", dto);
    const referrer = dto.referralCode
      ? await this.userModel.findOne({ referralCode: dto.referralCode }).exec()
      : null;

    return this.userModel.findOneAndUpdate(
      { phoneNumber },
      {
        $setOnInsert: {
          phoneNumber,
          username: dto.username,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          role: dto.role,
          referralCode: this.generateReferralCode(),
          referredBy: referrer?._id,
          password: dto.password ? this.hashPassword(dto.password) : undefined,
        },
      },
      { new: true, upsert: true },
    );
  }

  async findByPhoneNumber(phoneNumber: string) {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async verifyPhoneNumber(phoneNumber: string) {
    const user = await this.findByPhoneNumber(phoneNumber);
    if (!user) throw new Error('User not found');
    if (user.isPhoneVerified) throw new Error('Phone already verified');
    return this.userModel.findOneAndUpdate(
      { phoneNumber },
      { $set: { isPhoneVerified: true } },
      { new: true },
    );
  }

  async setPassword(phoneNumber: string, newPassword: string) {
    return this.userModel.findOneAndUpdate(
      { phoneNumber },
      { password: this.hashPassword(newPassword) },
      { new: true },
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.password !== this.hashPassword(currentPassword)) {
      throw new BadRequestException('Current password is incorrect');
    }
    return this.userModel.findByIdAndUpdate(
      userId,
      { password: this.hashPassword(newPassword) },
      { new: true },
    );
  }
}
