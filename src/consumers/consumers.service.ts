import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Consumer, ConsumerDocument } from '../schemas/Consumer.schema';
import { ConsumerResponseDto } from './dto/consumers.dto';
import { Vendor } from 'src/schemas/Vendor.schema';

@Injectable()
export class ConsumersService {
  constructor(
    @InjectModel(Consumer.name) private consumerModel: Model<ConsumerDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
  ) { }

  async getProfile(userId: string) {
    let consumer = await this.consumerModel.findOne({ userId }).exec();
    if (!consumer) {
      consumer = new this.consumerModel({
        userId,
        favorites: [],
        orderHistory: [],
      });
      await consumer.save();
    }
    return this.mapConsumerResponse(consumer);
  }

  async updateProfile(userId: string, updateData: any) {
    const consumer = await this.consumerModel
      .findOneAndUpdate({ userId }, updateData, { new: true, upsert: true })
      .exec();

    return this.mapConsumerResponse(consumer);
  }

  async toggleFavorite(userId: string, vendorId: string) {
    const consumer = await this.consumerModel.findOne({ userId }).exec();
    if (!consumer) {
      const newConsumer = await this.consumerModel.create({
        userId,
        favorites: [vendorId],
        orderHistory: [],
      });
      return this.mapConsumerResponse(newConsumer);
    }

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendorId');
    }

    const vendorExists = await this.vendorModel.findById(vendorId).exec();
    if (!vendorExists) {
      throw new NotFoundException('Vendor not found');
    }

    const isFavorited = consumer.favorites.includes(vendorId);
    if (isFavorited) {
      consumer.favorites = consumer.favorites.filter((id) => id !== vendorId);
    } else {
      consumer.favorites.push(vendorId);
    }
    await consumer.save();

    return this.mapConsumerResponse(consumer);
  }

  async getOrders(userId: string) {
    const consumer = await this.consumerModel.findOne({ userId }).exec();
    if (!consumer) {
      throw new NotFoundException('Consumer not found');
    }
    return consumer.orderHistory;
  }

  private mapConsumerResponse(consumer: any): ConsumerResponseDto {
    return {
      id: consumer._id.toString(),
      userId: consumer.userId,
      favorites: consumer.favorites || [],
      orderHistory: consumer.orderHistory || [],
      createdAt: consumer.createdAt,
      updatedAt: consumer.updatedAt,
    };
  }
}
