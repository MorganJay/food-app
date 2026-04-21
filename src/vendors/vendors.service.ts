import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vendor, VendorDocument } from '../schemas/Vendor.schema';

@Injectable()
export class VendorsService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
  ) {}

  async listAll(
    skip: number = 0,
    limit: number = 20,
    sortBy: string = 'avgRating',
  ) {
    return this.vendorModel
      .find({ isVerified: true })
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findById(id: string) {
    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return vendor;
  }

  async findNearby(latitude: number, longitude: number, radiusKm: number = 5) {
    return this.vendorModel
      .find({
        isVerified: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusKm * 1000,
          },
        },
      })
      .exec();
  }

  async createVendor(userId: string, vendorData: any) {
    const vendor = new this.vendorModel({
      userId,
      ...vendorData,
      isVerified: false,
    });
    return vendor.save();
  }

  async updateProfile(id: string, userId: string, updateData: any) {
    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    if (vendor.userId !== userId) {
      throw new BadRequestException(
        'You can only update your own vendor profile',
      );
    }
    return this.vendorModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }
}
