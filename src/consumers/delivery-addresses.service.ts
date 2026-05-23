import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DeliveryAddress,
  DeliveryAddressDocument,
} from '../schemas/DeliveryAddress.schema';
import {
  CreateDeliveryAddressDto,
  UpdateDeliveryAddressDto,
} from './dto/delivery-address.dto';

@Injectable()
export class DeliveryAddressesService {
  constructor(
    @InjectModel(DeliveryAddress.name)
    private addressModel: Model<DeliveryAddressDocument>,
  ) {}

  async create(consumerId: string, dto: CreateDeliveryAddressDto) {
    if (!dto.addressLine) {
      throw new BadRequestException('addressLine is required');
    }
    if (dto.isDefault) {
      await this.addressModel
        .updateMany({ consumerId }, { isDefault: false })
        .exec();
    }
    const created = new this.addressModel({ ...dto, consumerId });
    return created.save();
  }

  async findByConsumer(consumerId: string) {
    return this.addressModel
      .find({ consumerId, isDeleted: false })
      .sort({ isDefault: -1, updatedAt: -1 })
      .exec();
  }

  async findById(id: string, consumerId: string) {
    const addr = await this.addressModel
      .findOne({ _id: id, consumerId, isDeleted: false })
      .exec();
    if (!addr) throw new NotFoundException('Address not found');
    return addr;
  }

  async update(id: string, consumerId: string, dto: UpdateDeliveryAddressDto) {
    if (dto.isDefault) {
      await this.addressModel
        .updateMany({ consumerId }, { isDefault: false })
        .exec();
    }
    const updated = await this.addressModel
      .findOneAndUpdate({ _id: id, consumerId, isDeleted: false }, dto, {
        new: true,
      })
      .exec();
    if (!updated) throw new NotFoundException('Address not found');
    return updated;
  }

  async remove(id: string, consumerId: string) {
    const removed = await this.addressModel
      .findOneAndUpdate(
        { _id: id, consumerId, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) throw new NotFoundException('Address not found');
    return removed;
  }

  async countForConsumer(consumerId: string) {
    return this.addressModel
      .countDocuments({ consumerId, isDeleted: false })
      .exec();
  }
}
