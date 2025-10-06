import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { RegisterDto } from '../auth/dto/register.dto';
import { User, UserDocument } from '../schemas/User.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
  private readonly users = [
    {
      userId: 1,
      username: 'john',
      password: 'changeme',
    },
    {
      userId: 2,
      username: 'maria',
      password: 'guess',
    },
  ];

  async findOne(username: string): Promise<any | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async upsertByPhone(phone: string, dto: RegisterDto) {
    return this.userModel.findOneAndUpdate(
      { phone },
      {
        $setOnInsert: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          role: dto.role,
        },
      },
      { new: true, upsert: true },
    );
  }

  async findByPhone(phone: string) {
    return this.userModel.findOne({ phone });
  }

  async verifyPhone(phone: string) {
    const user = await this.findByPhone(phone);
    if (!user) throw new Error('User not found');
    if (user.isPhoneVerified) throw new Error('Phone already verified');
    return this.userModel.findOneAndUpdate(
      { phone },
      { $set: { isPhoneVerified: true } },
      { new: true },
    );
  }

  async findById(id: string) {
    return this.userModel.findById(id);
  }
}
