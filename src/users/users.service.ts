import { Model } from 'mongoose';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';

import { RegisterDto } from '../auth/dto/register.dto';
import { User, UserDocument } from '../schemas/User.schema';
import { UpdateAvatarDto, UpdateUserProfileDto, UserResponseDto } from './dto/users.dto';
import { hashPassword, verifyPassword } from '../common/password.util';
import { deleteFromCloudinary } from 'src/common/utils/cloudinary.util';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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

  async createByPhoneNumber(phoneNumber: string, dto: RegisterDto) {
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
      password: dto.password ? await hashPassword(dto.password) : undefined,
    });

    const savedUser = await user.save();
    return this.mapUserResponse(savedUser);
  }

  async findByPhoneNumber(
    phoneNumber: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.userModel.findOne({ phoneNumber }).exec();
    if (!user) return null;
    return this.mapUserResponse(user);
  }

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async verifyPhoneNumber(phoneNumber: string) {
    const existing = await this.userModel.findOne({ phoneNumber }).exec();
    if (!existing) throw new NotFoundException('User not found');
    const savedUser = await this.userModel.findOneAndUpdate(
      { phoneNumber },
      { $set: { isPhoneVerified: true } },
      { new: true },
    );
    if (!savedUser) throw new NotFoundException('User not found');
    return this.mapUserResponse(savedUser);
  }

  async setPassword(phoneNumber: string, newPassword: string) {
    const hashed = await hashPassword(newPassword);
    const user = await this.userModel.findOneAndUpdate(
      { phoneNumber },
      { password: hashed },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
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
    if (!(await verifyPassword(currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { password: await hashPassword(newPassword) },
      { new: true },
    );
    if (!updatedUser) throw new BadRequestException('User not found');
    return this.mapUserResponse(updatedUser);
  }

  async rehashPasswordToBcrypt(userId: string, plainPassword: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      password: await hashPassword(plainPassword),
    });
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.userModel.findOne({ email: dto.email });

      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }
    
    // phone check
    if (dto.phoneNumber && dto.phoneNumber !== user.phoneNumber) {
      const existingPhone = await this.userModel.findOne({
        phoneNumber: dto.phoneNumber,
      });

      if (existingPhone) {
        throw new BadRequestException('Phone number already exists');
      }
    }


    // username check
    if (dto.username && dto.username !== user.username) {
      const existingUsername = await this.userModel.findOne({
        username: dto.username,
      });

      if (existingUsername) {
        throw new BadRequestException('Username already exists');
      }
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(userId, dto,
      {
        new: true,
        runValidators: true,
      },
    );

    return this.mapUserResponse(updatedUser);
  }

  async uploadAvatar(userId: string, dto: UpdateAvatarDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Clean up older verification/avatar resources inside Cloudinary storage
      if (user.avatar?.public_id) {
        await deleteFromCloudinary(user.avatar.public_id).catch((err) =>
          console.error('Failed to clear old avatar asset:', err),
        );
      }

      user.avatar = {
        secure_url: dto.avatar.url.trim(),
        public_id: dto.avatar.publicId.trim(),
      };

      await user.save();

      return {
        avatar: user.avatar.secure_url,
      };
    } catch (error) {
      throw new BadRequestException('Failed to process user avatar update payload.');
    }
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      avatar: user.avatar?.secure_url,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
    };
  }

  private mapUserResponse(user: UserDocument): UserResponseDto {
    return {
      id: user._id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      serialNumber: user.serialNumber,
    };
  }
}
