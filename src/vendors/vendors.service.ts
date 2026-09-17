import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Vendor, VendorDocument } from '../schemas/Vendor.schema';
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorResponseDto,
} from './dto/create-vendor.dto';
import { mapToGeoLocation } from '../common/geojson';
import { deleteFromCloudinary } from 'src/common/utils/cloudinary.util';
import { NinVerificationDto } from './dto/nin-verification-vendor.dto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
  ) {}

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

    return vendors.map((vendor) => this.mapVendorResponse(vendor));
  }

  async findById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid vendor ID: ${id}`);
    }

    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return this.mapVendorResponse(vendor);
  }

  async createVendor(userId: string, createVendor: CreateVendorDto) {
    const existing = await this.vendorModel
      .findOne({ businessName: createVendor.businessName })
      .exec();

    if (existing) {
      throw new BadRequestException('Vendor name already exists');
    }

    const geo = createVendor.location
      ? mapToGeoLocation(createVendor.location.longitude, createVendor.location.latitude)
      : null;

    const vendorData: any = {
      userId,
      businessName: createVendor.businessName,
      description: createVendor.description,
      address: createVendor.location?.address,
      location: geo,
      isVerified: false,
    };

    const vendor = await this.vendorModel.create(vendorData);
    return this.mapVendorResponse(vendor);
  }

  async updateProfile(userId: string, updateData: UpdateVendorDto) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found for this user account context.');
    }

    // Check business name uniqueness if it's being updated
    if (
      updateData.businessName &&
      updateData.businessName !== vendor.businessName
    ) {
      const existing = await this.vendorModel
        .findOne({ businessName: updateData.businessName })
        .exec();
      if (existing) {
        throw new BadRequestException('Vendor name already exists');
      }
    }

    const geo = updateData.location
      ? mapToGeoLocation(updateData.location.longitude, updateData.location.latitude)
      : undefined;

    const updatePayload: any = {};

    if (updateData.businessName !== undefined) {
      updatePayload.businessName = updateData.businessName;
    }

    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description;
    }

    if (updateData.location?.address !== undefined) {
      updatePayload.address = updateData.location.address;
    }

    if (geo) {
      updatePayload.location = geo;
    }

    const updatedVendor = await this.vendorModel
      .findByIdAndUpdate(vendor._id, updatePayload, { new: true })
      .exec();

    if (!updatedVendor) {
      throw new NotFoundException('Failed to update vendor profile.');
    }

    return this.mapVendorResponse(updatedVendor);
  }

  async submitNin(userId: string, dto: NinVerificationDto) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor profile tracking context not found for user ID ${userId}`);
    }

    if (!dto.ninDocument || !dto.ninDocument.url) {
      throw new BadRequestException('A pre-uploaded NIN document verification payload is required.');
    }

    if (!dto.selfie || !dto.selfie.url) {
      throw new BadRequestException('A pre-uploaded face live selfie verification payload is required.');
    }

    // Clean up older verification artifacts from Cloudinary
    if (vendor.ninDocument?.public_id) {
      await deleteFromCloudinary(vendor.ninDocument.public_id).catch((err) =>
        this.logger.error('Failed to clear old verification image artifact:', err),
      );
    }
    if (vendor.selfie?.public_id) {
      await deleteFromCloudinary(vendor.selfie.public_id).catch((err) =>
        this.logger.error('Failed to clear old selfie artifact:', err),
      );
    }

    const updatePayload: any = {
      nin: dto.nin.trim(),
      isNinVerified: false,
      ninDocument: {
        secure_url: dto.ninDocument.url.trim(),
        public_id: dto.ninDocument.publicId.trim(),
      },
      selfie: {
        secure_url: dto.selfie.url.trim(),
        public_id: dto.selfie.publicId.trim(),
      },
    };

    const updated = await this.vendorModel
      .findOneAndUpdate({ userId }, updatePayload, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to process NIN submission.');
    }

    return this.mapVendorResponse(updated);
  }

  async verifyNin(vendorId: string) {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException(`Invalid vendor ID: ${vendorId}`);
    }

    const vendor = await this.vendorModel.findById(vendorId).exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor not found`);
    }

    vendor.isNinVerified = true;
    await vendor.save();

    return this.mapVendorResponse(vendor);
  }

  async getVendorStats(userId: string) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    return {
      vendorId: vendor._id.toString(),
      totalOrders: vendor.totalOrders || 0,
      totalEarnings: vendor.totalEarnings || 0,
      avgRating: vendor.avgRating || 0,
    };
  }

  private mapVendorResponse(vendor: any): VendorResponseDto {
    if (!vendor) {
      return null;
    }

    return {
      id: vendor._id?.toString(),
      businessName: vendor.businessName,
      description: vendor.description,
      isVerified: vendor.isVerified,
      location: {
        address: vendor.address,
        latitude: vendor.location?.coordinates?.[1],
        longitude: vendor.location?.coordinates?.[0],
      },
      image: vendor.image?.secure_url,
      workingDays: vendor.workingDays,
      orderType: vendor.orderType,
      nin: vendor.nin,
      ninDocument: vendor.ninDocument?.secure_url,
      selfie: vendor.selfie?.secure_url,
      isNinVerified: vendor.isNinVerified,

      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      serialNumber: vendor.serialNumber,
    };
  }
}