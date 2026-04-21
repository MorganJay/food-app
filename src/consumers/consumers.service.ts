import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consumer, ConsumerDocument } from '../schemas/Consumer.schema';

@Injectable()
export class ConsumersService {
  constructor(
    @InjectModel(Consumer.name) private consumerModel: Model<ConsumerDocument>,
  ) {}

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
    return consumer;
  }

  async updateProfile(userId: string, updateData: any) {
    return this.consumerModel
      .findOneAndUpdate({ userId }, updateData, { new: true, upsert: true })
      .exec();
  }

  async toggleFavorite(userId: string, vendorId: string) {
    const consumer = await this.consumerModel.findOne({ userId }).exec();
    if (!consumer) {
      const newConsumer = new this.consumerModel({
        userId,
        favorites: [vendorId],
        orderHistory: [],
      });
      return newConsumer.save();
    }

    const isFavorited = consumer.favorites.includes(vendorId);
    if (isFavorited) {
      consumer.favorites = consumer.favorites.filter((id) => id !== vendorId);
    } else {
      consumer.favorites.push(vendorId);
    }
    return consumer.save();
  }

  async getOrders(userId: string) {
    const consumer = await this.consumerModel.findOne({ userId }).exec();
    if (!consumer) {
      throw new NotFoundException('Consumer not found');
    }
    return consumer.orderHistory;
  }
}
