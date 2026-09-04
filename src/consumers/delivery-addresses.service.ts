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
  DeliveryAddressResponseDto,
  UpdateDeliveryAddressDto,
} from './dto/delivery-address.dto';

@Injectable()
export class DeliveryAddressesService {
  constructor(
    @InjectModel(DeliveryAddress.name)
    private addressModel: Model<DeliveryAddressDocument>,
  ) {}

  async create(consumerId: string, dto: CreateDeliveryAddressDto): Promise<DeliveryAddressResponseDto> {
    if (!dto.addressLine) {
      throw new BadRequestException('addressLine is required');
    }
    if (dto.isDefault) {
      await this.addressModel
        .updateMany({ consumerId }, { isDefault: false })
        .exec();
    }
    const created = new this.addressModel({ ...dto, consumerId });
    const saved = await created.save();

    return this.mapDeliveryAddressResponse(saved);
  }

  async findByConsumer(consumerId: string): Promise<DeliveryAddressResponseDto[]> {
    const addresses = await this.addressModel
      .find({ consumerId, isDeleted: false })
      .sort({ isDefault: -1, updatedAt: -1 })
      .exec();

    return addresses.map(address =>
      this.mapDeliveryAddressResponse(
        address,
      ),
    );
  }

  async findById(id: string, consumerId: string): Promise<DeliveryAddressResponseDto> {
    const addr = await this.addressModel
      .findOne({ _id: id, consumerId, isDeleted: false })
      .exec();
    if (!addr) throw new NotFoundException('Address not found');
    return this.mapDeliveryAddressResponse(addr);
  }

  async update(id: string, consumerId: string, dto: UpdateDeliveryAddressDto): Promise<DeliveryAddressResponseDto> {
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
    return this.mapDeliveryAddressResponse(updated);
  }

  async remove(id: string, consumerId: string): Promise<DeliveryAddressResponseDto> {
    const removed = await this.addressModel
      .findOneAndUpdate(
        { _id: id, consumerId, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) throw new NotFoundException('Address not found');
    return this.mapDeliveryAddressResponse(removed);
  }

  async countForConsumer(consumerId: string): Promise<number> {
    return this.addressModel
      .countDocuments({ consumerId, isDeleted: false })
      .exec();
  }

  private mapDeliveryAddressResponse(address: DeliveryAddressDocument): DeliveryAddressResponseDto {
    return {
      id: address._id.toString(),
      consumerId: address.consumerId,
      label: address.label,
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,

      location: address.location
        ? {
            lat: address.location.lat,
            lng: address.location.lng,
          }
        : undefined,

      instructions: address.instructions,
      isDefault: address.isDefault,
      serialNumber: address.serialNumber,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
