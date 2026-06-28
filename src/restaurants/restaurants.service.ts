import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../schemas/Restaurant.schema';
import { Category, CategoryDocument } from '../schemas/Category.schema';
import {
  CreateRestaurantDto,
  RestaurantResponseDto,
  UpdateRestaurantDto,
} from './dto/restaurant.dto';
import { mapToGeoLocation } from '../common/geojson';
import { deleteFromCloudinary, uploadToCloudinary } from 'src/common/utils/cloudinary.util';
import { Vendor, VendorDocument } from 'src/schemas/Vendor.schema';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
  ) {}

  async create(createDto: CreateRestaurantDto, userId: string, file?: Express.Multer.File) {
    if (!createDto.location) {
      throw new BadRequestException('Restaurant location object details are required.');
    }

    const { address, latitude, longitude } = createDto.location;
    
    if (!address || address.trim() === '') {
      throw new BadRequestException('The location address field text is required.');
    } 

    if (!file) {
      throw new BadRequestException('A restaurant banner image is required.');
    }

    const vendor = await this.vendorModel.findOne({ userId }); 
    if (!vendor) {
      throw new NotFoundException('No active vendor profile record matches this user account context.');
    }
    const vendorId = vendor.id || vendor._id.toString();

    const cloudinaryResult = await uploadToCloudinary(file, 'restaurants');
    const chosenCategories: string[] = createDto.categories || [];

    if (chosenCategories.length > 0) {
      await Promise.all(
        chosenCategories.map(async (categoryName) => {
          const cleanName = categoryName.trim();
          await this.categoryModel.findOneAndUpdate(
            { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
            { $setOnInsert: { name: cleanName } },
            { upsert: true },
          ).exec();
        }),
      );
    }

    const restaurantData: any = {
      name: createDto.name,
      description: createDto.description,
      openHours: createDto.openHours,
      closeHours: createDto.closeHours,
      workingDays: createDto.workingDays || [],
      orderType: createDto.orderType,
      categories: chosenCategories.map((c) => c.trim()),
      bannerImage: {
        secure_url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
      },
      address: address.trim(),
      vendorId,
    };

    const geoLocation = mapToGeoLocation(longitude, latitude);
    if (geoLocation) {
      restaurantData.location = geoLocation;
    }

    const restaurant = await this.restaurantModel.create(restaurantData);
    return this.mapRestaurantResponse(restaurant);
}

  async findAll(skip: number = 0, limit: number = 10) {
    const restaurants = await this.restaurantModel
      .find({ isActive: true })
      .skip(skip)
      .limit(limit)
      .exec();

    return restaurants.map((restaurant) =>
      this.mapRestaurantResponse(restaurant),
    );
  }

  async findById(id: string) {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    return this.mapRestaurantResponse(restaurant);
  }

  async findNearby(latitude: number, longitude: number, radiusKm: number = 5) {
    const restaurants = await this.restaurantModel
      .find({
        isActive: true,
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

    return restaurants.map((restaurant) => this.mapRestaurantResponse(restaurant));
  }

  async search(query: string, skip: number = 0, limit: number = 10) {
    const restaurants = await this.restaurantModel
      .find(
        { $text: { $search: query }, isActive: true },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .exec();

    return restaurants.map((restaurant) =>
      this.mapRestaurantResponse(restaurant),
    );
  }

  async findByVendor(vendorId: string, skip: number = 0, limit: number = 10) {
    const restaurants = await this.restaurantModel
      .find({ vendorId })
      .skip(skip)
      .limit(limit)
      .exec();

    return restaurants.map((restaurant) =>
      this.mapRestaurantResponse(restaurant),
    );
  }

  async update(id: string, vendorId: string, updateDto: UpdateRestaurantDto, file?: Express.Multer.File) {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    if (restaurant.vendorId !== vendorId) {
      throw new ForbiddenException('You can only update your own restaurants');
    }

    const updatePayload: any = {};

    // Swap files out in Cloudinary securely if a new one arrives
    if (file) {
      if (restaurant.bannerImage?.public_id) {
        await deleteFromCloudinary(restaurant.bannerImage.public_id).catch((err) =>
          console.error('Failed to clear old banner out of Cloudinary storage:', err),
        );
      }
      const cloudinaryResult = await uploadToCloudinary(file, 'restaurants');
      updatePayload.bannerImage = {
        secure_url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
      };
    }

    if (updateDto.categories !== undefined) {
      const chosenCategories = updateDto.categories || [];
      if (chosenCategories.length > 0) {
        await Promise.all(
          chosenCategories.map(async (categoryName) => {
            const cleanName = categoryName.trim();
            await this.categoryModel.findOneAndUpdate(
              { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
              { $setOnInsert: { name: cleanName } },
              { upsert: true },
            ).exec();
          }),
        );
      }
      updatePayload.categories = chosenCategories.map((c) => c.trim());
    }

    if (updateDto.name !== undefined) updatePayload.name = updateDto.name;
    if (updateDto.description !== undefined) updatePayload.description = updateDto.description;
    if (updateDto.isActive !== undefined) updatePayload.isActive = updateDto.isActive;
    if (updateDto.openHours !== undefined) updatePayload.openHours = updateDto.openHours;
    if (updateDto.closeHours !== undefined) updatePayload.closeHours = updateDto.closeHours;
    if (updateDto.workingDays !== undefined) updatePayload.workingDays = updateDto.workingDays;
    if (updateDto.orderType !== undefined) updatePayload.orderType = updateDto.orderType;

    if (updateDto.location) {
      const { address, latitude, longitude } = updateDto.location;
      if (address) updatePayload.address = address;
      if (latitude !== undefined && longitude !== undefined) {
        const geoLocation = mapToGeoLocation(longitude, latitude);
        if (geoLocation) {
          updatePayload.location = geoLocation;
        }
      }
    }

    const updatedRestaurant = await this.restaurantModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();

    return this.mapRestaurantResponse(updatedRestaurant);
  }

  async delete(id: string, vendorId: string): Promise<{ status: string; message: string }> {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    if (restaurant.vendorId !== vendorId) {
      throw new ForbiddenException('You can only delete your own restaurants');
    }

    if (restaurant.bannerImage?.public_id) {
      await deleteFromCloudinary(restaurant.bannerImage.public_id).catch((err) =>
        console.error('Failed to drop storage assets during hard deletion purge:', err),
      );
    }

    await this.restaurantModel.findByIdAndDelete(id).exec();
    return { status: 'ok', message: 'Restaurant deleted successfully' };
  }

  private mapRestaurantResponse(restaurant: any): RestaurantResponseDto {
    return {
      id: restaurant._id.toString(),
      name: restaurant.name,
      description: restaurant.description,
      vendorId: restaurant.vendorId,
      isActive: restaurant.isActive,
      openHours: restaurant.openHours,
      closeHours: restaurant.closeHours,
      workingDays: restaurant.workingDays || [], 
      orderType: restaurant.orderType,
      categories: restaurant.categories || [],
      bannerImage: restaurant.bannerImage?.secure_url || '',
      location: {
        address: restaurant.address,
        latitude: restaurant.location?.coordinates?.[1],
        longitude: restaurant.location?.coordinates?.[0],
      },
      rating: restaurant.rating,
      reviewCount: restaurant.reviewCount,
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
      serialNumber: restaurant.serialNumber,
    };
  }
}