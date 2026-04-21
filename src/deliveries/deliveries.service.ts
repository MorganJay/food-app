import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Delivery,
  DeliveryDocument,
  DeliveryStatus,
} from '../schemas/Delivery.schema';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
  ) {}

  async create(orderId: string, destinationAddress: string) {
    const delivery = new this.deliveryModel({
      orderId,
      destinationAddress,
      status: DeliveryStatus.ASSIGNED,
    });
    return delivery.save();
  }

  async findById(id: string) {
    const delivery = await this.deliveryModel.findById(id).exec();
    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }
    return delivery;
  }

  async findByOrderId(orderId: string) {
    return this.deliveryModel.findOne({ orderId }).exec();
  }

  async findByDriver(driverId: string, skip: number = 0, limit: number = 20) {
    return this.deliveryModel
      .find({ driverId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async assignDriver(id: string, driverId: string) {
    return this.deliveryModel
      .findByIdAndUpdate(
        id,
        { driverId, status: DeliveryStatus.PICKED_UP },
        { new: true },
      )
      .exec();
  }

  async updateLocation(id: string, latitude: number, longitude: number) {
    return this.deliveryModel
      .findByIdAndUpdate(
        id,
        {
          currentLocation: { latitude, longitude },
          status: DeliveryStatus.IN_TRANSIT,
        },
        { new: true },
      )
      .exec();
  }

  async updateStatus(id: string, status: DeliveryStatus) {
    if (status === DeliveryStatus.DELIVERED) {
      return this.deliveryModel
        .findByIdAndUpdate(
          id,
          { status, actualDeliveryTime: new Date() },
          { new: true },
        )
        .exec();
    }
    return this.deliveryModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }
}
