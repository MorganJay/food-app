import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { deleteFromCloudinary, uploadToCloudinary } from 'src/common/utils/cloudinary.util';
import { SetupStoreDto } from './dto/setup-store.dto';

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

  // async findNearby(latitude: number, longitude: number, radiusKm: number = 5) {
  //   const vendors = await this.vendorModel
  //     .find({
  //       isVerified: true,
  //       location: {
  //         $near: {
  //           $geometry: {
  //             type: 'Point',
  //             coordinates: [longitude, latitude],
  //           },
  //           $maxDistance: radiusKm * 1000,
  //         },
  //       },
  //     })
  //     .exec();

  //   return vendors.map((vendor) => this.mapVendorResponse(vendor));
  // }

  async createVendor(userId: string, createVendor: CreateVendorDto) {
    const existing = await this.vendorModel.findOne({
      businessName: createVendor.businessName,
    });

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

  // async setupStore(userId: string, setupStoreDto: SetupStoreDto, storeBannerFile?: Express.Multer.File) {
  //   const vendor = await this.vendorModel.findOne({ userId }).exec();
  //   if (!vendor) {
  //     throw new NotFoundException(`Vendor profile not found for this user`);
  //   }

  //   const updatePayload: any = {
  //     workingDays: setupStoreDto.workingDays,
  //   };

  //   if (setupStoreDto.orderType) {
  //     updatePayload.orderType = setupStoreDto.orderType;
  //   }

  //   // Handle Banner Image upload
  //   if (storeBannerFile) {
  //     if (vendor.image?.public_id) {
  //       await deleteFromCloudinary(vendor.image.public_id);
  //     }

  //     const uploadedBanner = await uploadToCloudinary(storeBannerFile, 'vendors');
  //     updatePayload.image = {
  //       secure_url: uploadedBanner.secure_url,
  //       public_id: uploadedBanner.public_id,
  //     };
  //   }

  //   const updatedVendor = await this.vendorModel.findOneAndUpdate(
  //     { userId },
  //     updatePayload,
  //     { new: true },
  //   ).exec();

  //   return this.mapVendorResponse(updatedVendor);
  // }

  async updateProfile(userId: string, updateData: UpdateVendorDto) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found for this user account context.');
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

    return this.mapVendorResponse(updatedVendor);
  }

  async submitNin(userId: string, nin: string, ninDocument?: Express.Multer.File, selfie?: Express.Multer.File) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${userId} not found`);
    }

    const updatePayload: any = {
      nin,
      isNinVerified: false,
    };

    if (!ninDocument || !selfie) {
      throw new BadRequestException('Both your NIN document and a live selfie are required.');
    }

    // Upload NIN Document
    if (ninDocument) {
      const uploadedNin = await uploadToCloudinary(ninDocument, 'nin-verification-images');
      updatePayload.ninDocument = {
        secure_url: uploadedNin.secure_url,
        public_id: uploadedNin.public_id,
      };
    }

    // Upload Selfie
    if (selfie) {
      const uploadedSelfie = await uploadToCloudinary(selfie, 'vendor-selfies');
      updatePayload.selfie = {
        secure_url: uploadedSelfie.secure_url,
        public_id: uploadedSelfie.public_id,
      };
    }

    const updated = await this.vendorModel.findOneAndUpdate(
      { userId },
      updatePayload,
      { new: true },
    );

    return this.mapVendorResponse(updated);
  }

  // manual verification by admin - in production this would be an automated process using a third-party service
  async verifyNin(vendorId: string) {
    const vendor = await this.vendorModel.findById(vendorId).exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor not found`);
    }

    // todo: logic to verify NIN number and photo goes here - for now we just set it to verified

    vendor.isNinVerified = true;
    await vendor.save();

    return this.mapVendorResponse(vendor);
  }

  private mapVendorResponse(vendor: any): VendorResponseDto {
    return {
      id: vendor._id.toString(),
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
