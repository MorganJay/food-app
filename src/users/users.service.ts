import { Model } from 'mongoose';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';

import { RegisterDto } from '../auth/dto/register.dto';
import { User, UserDocument } from '../schemas/User.schema';
import { UserResponseDto } from './dto/users.dto';

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
    return this.userModel
      .findOne({
        $or: [{ username }, { phoneNumber: username }, { email: username }],
      })
      .lean()
      .exec();
  }

  async findDuplicate(dto: RegisterDto) {
    return this.userModel.findOne({
      $or: [
        { phoneNumber: dto.phoneNumber },
        { email: dto.email },
        { username: dto.username },
      ],
    });
  }

  async upsertByPhoneNumber(phoneNumber: string, dto: RegisterDto) {
    const referrer = dto.referralCode
      ? await this.userModel.findOne({ referralCode: dto.referralCode }).exec()
      : null;

    const user = new this.userModel({
      phoneNumber,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      role: dto.role,
      referralCode: this.generateReferralCode(),
      referredBy: referrer?._id,
      password: dto.password ? this.hashPassword(dto.password) : undefined,
    });

    const savedUser = await user.save();
    return this.mapUserResponse(savedUser);
  }

  async findByPhoneNumber(phoneNumber: string) {
    const user = await this.userModel.findOne({ phoneNumber }).exec();
    return this.mapUserResponse(user);
  }

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async verifyPhoneNumber(phoneNumber: string) {
    const user = await this.findByPhoneNumber(phoneNumber);
    if (!user) throw new Error('User not found');
    if (user.isPhoneVerified) throw new Error('Phone already verified');
    const savedUser = await this.userModel.findOneAndUpdate(
      { phoneNumber },
      { $set: { isPhoneVerified: true } },
      { new: true },
    );

    return this.mapUserResponse(savedUser);
  }

  async setPassword(phoneNumber: string, newPassword: string) {
    const user = await this.userModel.findOneAndUpdate(
      { phoneNumber },
      { password: this.hashPassword(newPassword) },
      { new: true },
    );
    return this.mapUserResponse(user);
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
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { password: this.hashPassword(newPassword) },
      { new: true },
    );

    return this.mapUserResponse(updatedUser);
  }

  private mapUserResponse(user: any): UserResponseDto {
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
