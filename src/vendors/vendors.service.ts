import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vendor, VendorDocument } from '../schemas/Vendor.schema';
import { CreateVendorDto, UpdateVendorDto, VendorResponseDto } from './dto/create-vendor.dto';
import { mapToGeoLocation } from 'src/common/geojson';

@Injectable()
export class VendorsService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
  ) { }

  async listAll(
    skip: number = 0,
    limit: number = 20,
    sortBy: string = 'avgRating',
  ) {
    const vendors = await this.vendorModel
      .find({ isVerified: true })
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return vendors.map(vendor => this.mapVendorResponse(vendor));
  }

  async findById(id: string) {
    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return this.mapVendorResponse(vendor);
  }

  async findNearby(latitude: number, longitude: number, radiusKm: number = 5) {
    const vendors = await this.vendorModel
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

    return vendors.map(vendor => this.mapVendorResponse(vendor));
  }

  async createVendor(userId: string, createVendor: CreateVendorDto) {
    const location = createVendor.location;

    const existing = await this.vendorModel.findOne({
      businessName: createVendor.businessName,
    });

    if (existing) {
      throw new BadRequestException('Vendor name already exists');
    }

    const vendorData: any = {
      userId,
      businessName: createVendor.businessName,
      description: createVendor.description,
      openHours: createVendor.openHours,
      closeHours: createVendor.closeHours,
      isVerified: false,
    };

    const latitude = location?.latitude;
    const longitude = location?.longitude;

    if (location?.address) {
      vendorData.address = location.address;
    }

    if (latitude !== undefined && longitude !== undefined) {
      vendorData.location = mapToGeoLocation(longitude, latitude);
    }

    const vendor = new this.vendorModel(vendorData);
    const savedVendor = await vendor.save();

    return this.mapVendorResponse(savedVendor);
  }

  async updateProfile(id: string, userId: string, updateData: UpdateVendorDto) {
    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    if (vendor.userId !== userId) {
      throw new BadRequestException(
        'You can only update your own vendor profile',
      );
    }

    const updatePayload: any = {};

    if (updateData.businessName !== undefined) {
      updatePayload.businessName = updateData.businessName;
    }

    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description;
    }

    if (updateData.openHours) {
      updatePayload.openHours = updateData.openHours;
    }

    if (updateData.closeHours) {
      updatePayload.closeHours = updateData.closeHours;
    }

    // handle location mapping
    if (updateData.location) {
      const { address, latitude, longitude } = updateData.location;

      if (address) {
        updatePayload.address = address;
      }

      if (latitude !== undefined && longitude !== undefined) {
        updatePayload.location = mapToGeoLocation(longitude, latitude);
      }
    }

    const updatedVendor = await this.vendorModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();

    return this.mapVendorResponse(updatedVendor);
  }

  private mapVendorResponse(vendor: any): VendorResponseDto {
    return {
      id: vendor._id.toString(),
      businessName: vendor.businessName,
      description: vendor.description,
      openHours: vendor.openHours,
      closeHours: vendor.closeHours,
      isVerified: vendor.isVerified,
      location: {
        address: vendor.address,
        latitude: vendor.location?.coordinates?.[1],
        longitude: vendor.location?.coordinates?.[0],
      },
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}