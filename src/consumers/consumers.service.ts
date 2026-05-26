import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Consumer, ConsumerDocument } from '../schemas/Consumer.schema';
import {
  DeliveryAddress,
  DeliveryAddressDocument,
} from '../schemas/DeliveryAddress.schema';
import { ConsumerResponseDto } from './dto/consumers.dto';
import { Vendor } from '../schemas/Vendor.schema';

@Injectable()
export class ConsumersService {
  constructor(
    @InjectModel(Consumer.name) private consumerModel: Model<ConsumerDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
    @InjectModel(DeliveryAddress.name)
    private addressModel: Model<DeliveryAddressDocument>,
  ) {}

  async getProfile(userId: string) {
    let consumer = await this.consumerModel.findOne({ userId }).exec();
    if (!consumer) {
      consumer = await this.consumerModel.create({
        userId,
        favorites: [],
        orderHistory: [],
      });
    }
    const addresses = await this.addressModel
      .find({ consumerId: userId, isDeleted: false })
      .sort({ isDefault: -1, updatedAt: -1 })
      .exec();
    return this.mapConsumerResponse(consumer, addresses);
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

  private mapConsumerResponse(
    consumer: any,
    addresses: any[] = [],
  ): ConsumerResponseDto & { addresses?: any[] } {
    return {
      id: consumer._id.toString(),
      userId: consumer.userId,
      favorites: consumer.favorites || [],
      orderHistory: consumer.orderHistory || [],
      serialNumber: consumer.serialNumber,
      createdAt: consumer.createdAt,
      updatedAt: consumer.updatedAt,
      addresses: addresses.map((address) => ({
        id: address._id.toString(),
        label: address.label,
        addressLine: address.addressLine,
        // consumerId: address.consumerId,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        location: address.location,
        instructions: address.instructions,
        isDefault: address.isDefault,
        serialNumber: address.serialNumber,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      })),
    };
  }
}
