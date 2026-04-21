import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rider, RiderDocument } from '../schemas/Rider.schema';

@Injectable()
export class RidersService {
  constructor(
    @InjectModel(Rider.name) private riderModel: Model<RiderDocument>,
  ) {}

  async updateStatus(userId: string, isOnline: boolean) {
    return this.riderModel
      .findOneAndUpdate({ userId }, { isOnline }, { new: true, upsert: true })
      .exec();
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    return this.riderModel
      .findOneAndUpdate(
        { userId },
        {
          currentGeolocation: {
            latitude,
            longitude,
            timestamp: new Date(),
          },
        },
        { new: true, upsert: true },
      )
      .exec();
  }

  async findOnlineRiders() {
    return this.riderModel.find({ isOnline: true }).exec();
  }
}
