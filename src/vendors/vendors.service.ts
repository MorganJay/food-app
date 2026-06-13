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
import { v2 as cloudinary } from "cloudinary";
import { UploadApiResponse } from 'cloudinary';

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

    if (createVendor.image) {
      const uploaded = await cloudinary.uploader.upload(
        createVendor.image,
        { folder: 'vendors' },
      );

      vendorData.image = {
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      };
    }

    const vendor = await this.vendorModel.create(vendorData);
    return this.mapVendorResponse(vendor);
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

    if (updateData.location?.address) {
      updatePayload.address = updateData.location?.address;
    }

    if (geo) {
      updatePayload.location = geo;
    }

    if (updateData.image) {
      // delete old image first
      if (vendor.image?.public_id) {
        await cloudinary.uploader.destroy(vendor.image.public_id);
      }

      const uploaded = await cloudinary.uploader.upload(
        updateData.image,
        { folder: 'vendors' },
      );

      updatePayload.image = {
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      };
    }

    const updatedVendor = await this.vendorModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();

    return this.mapVendorResponse(updatedVendor);
  }

  async ninVerification(userId: string, ninNumber: string, ninPhoto?: Express.Multer.File,) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${userId} not found`);
    }

    const updatePayload: any = {
      ninNumber,
      isNinVerified: false,
    };

    // upload NIN photo to Cloudinary
    if (ninPhoto) {
      const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "nin-verification-images" },
          (error, result) => {
            if (error) return reject(error);
            if (!result) return reject(new Error('Cloudinary upload failed'));
            resolve(result);
          },
        );

        stream.end(ninPhoto.buffer);
      });

      updatePayload.ninPhoto = {
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      };
    }

    const updated = await this.vendorModel.findOneAndUpdate({ userId },
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
      openHours: vendor.openHours,
      closeHours: vendor.closeHours,
      isVerified: vendor.isVerified,
      location: {
        address: vendor.address,
        latitude: vendor.location?.coordinates?.[1],
        longitude: vendor.location?.coordinates?.[0],
      },
      image: vendor.image?.secure_url,
      ninNumber: vendor.ninNumber,
      isNinVerified: vendor.isNinVerified,
      ninPhoto: vendor.ninPhoto?.secure_url,

      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      serialNumber: vendor.serialNumber,
    };
  }
}
