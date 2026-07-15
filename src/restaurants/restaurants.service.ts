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
import { deleteFromCloudinary } from 'src/common/utils/cloudinary.util';
import { Vendor, VendorDocument } from 'src/schemas/Vendor.schema';
import { UserRole } from 'src/schemas/User.schema';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
  ) {}

  async create(createDto: CreateRestaurantDto, userId: string) {
    if (!createDto.location) {
      throw new BadRequestException(
        'Restaurant location object details are required.',
      );
    }

    const vendor = await this.vendorModel.findOne({ userId });
    if (!vendor) {
      throw new NotFoundException(
        'No active vendor profile record matches this user account context.',
      );
    }

    const { address, latitude, longitude } = createDto.location;

    if (!address || address.trim() === '') {
      throw new BadRequestException(
        'The location address field text is required.',
      );
    }

    if (!createDto.bannerImage || !createDto.bannerImage.url) {
      throw new BadRequestException(
        'A pre-uploaded banner image payload (url & publicId) is required.',
      );
    }

    const vendorId = vendor.id || vendor._id.toString();
    const chosenCategories: string[] = createDto.categories || [];

    if (chosenCategories.length > 0) {
      await Promise.all(
        chosenCategories.map(async (categoryName) => {
          const cleanName = categoryName.trim();
          await this.categoryModel
            .findOneAndUpdate(
              { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
              { $setOnInsert: { name: cleanName } },
              { upsert: true },
            )
            .exec();
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
        secure_url: createDto.bannerImage.url.trim(),
        public_id: createDto.bannerImage.publicId?.trim(),
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

    return restaurants.map((restaurant) =>
      this.mapRestaurantResponse(restaurant),
    );
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

  async getRestaurantsByVendor(userId: string) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found.');
    }

    const vendorId = vendor.id || vendor._id.toString();
    return this.findByVendor(vendorId);
  }

  async update(restaurantId: string, userId: string, updateDto: UpdateRestaurantDto) {
    const vendor = await this.vendorModel.findOne({ userId }).exec();
    if (!vendor) {
      throw new ForbiddenException('No active vendor profile found.');
    }
    const vendorId = vendor.id || vendor._id.toString();

    const restaurant = await this.restaurantModel.findById(restaurantId).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${restaurantId} not found`);
    }
    
    if (restaurant.vendorId.toString() !== vendorId.toString()) {
      throw new ForbiddenException('You can only update your own restaurants');
    }

    const updatePayload: any = {};

    if (updateDto.bannerImage) {
      if (updateDto.bannerImage.publicId && restaurant.bannerImage?.public_id) {
        // Clear out the previous assets from Cloudinary
        await deleteFromCloudinary(restaurant.bannerImage.public_id).catch(
          (err) =>
            console.error(
              'Failed to clear old banner out of Cloudinary storage:',
              err,
            ),
        );

        updatePayload.bannerImage = {
          secure_url: updateDto.bannerImage.url.trim(),
          public_id: updateDto.bannerImage.publicId.trim(),
        };
      } else if (updateDto.bannerImage.url) {
        // If there's no new publicId to swap (just updating metadata or keeping current), don't break
        updatePayload.bannerImage = {
          secure_url: updateDto.bannerImage.url.trim(),
          public_id: restaurant.bannerImage?.public_id || '',
        };
      }
    }

    if (updateDto.categories !== undefined) {
      const chosenCategories = updateDto.categories || [];
      if (chosenCategories.length > 0) {
        await Promise.all(
          chosenCategories.map(async (categoryName) => {
            const cleanName = categoryName.trim();
            await this.categoryModel
              .findOneAndUpdate(
                { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
                { $setOnInsert: { name: cleanName } },
                { upsert: true },
              )
              .exec();
          }),
        );
      }
      updatePayload.categories = chosenCategories.map((c) => c.trim());
    }

    if (updateDto.name !== undefined) updatePayload.name = updateDto.name;
    if (updateDto.description !== undefined)
      updatePayload.description = updateDto.description;
    if (updateDto.isActive !== undefined)
      updatePayload.isActive = updateDto.isActive;
    if (updateDto.openHours !== undefined)
      updatePayload.openHours = updateDto.openHours;
    if (updateDto.closeHours !== undefined)
      updatePayload.closeHours = updateDto.closeHours;
    if (updateDto.workingDays !== undefined)
      updatePayload.workingDays = updateDto.workingDays;
    if (updateDto.orderType !== undefined)
      updatePayload.orderType = updateDto.orderType;

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
      .findByIdAndUpdate(restaurantId, updatePayload, { new: true })
      .exec();

    return this.mapRestaurantResponse(updatedRestaurant);
  }

  async delete(restaurantId: string, userId: string): Promise<{ status: string; message: string }> {
    const vendor = await this.vendorModel.findOne({ userId }).exec();
    if (!vendor) {
      throw new ForbiddenException('No active vendor profile found.');
    }
    const vendorId = vendor.id || vendor._id.toString();

    const restaurant = await this.restaurantModel.findById(restaurantId).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${restaurantId} not found`);
    }
    
    if (restaurant.vendorId.toString() !== vendorId.toString()) {
      throw new ForbiddenException('You can only delete your own restaurants');
    }

    if (restaurant.bannerImage?.public_id) {
      await deleteFromCloudinary(restaurant.bannerImage.public_id).catch(
        (err) =>
          console.error(
            'Failed to drop storage assets during hard deletion purge:',
            err,
          ),
      );
    }

    await this.restaurantModel.findByIdAndDelete(restaurantId).exec();
    return { status: 'ok', message: 'Restaurant deleted successfully' };
  }

  async toggleStatus(restaurantId: string, user: { sub: string; role: string }) {
    // Find the restaurant first
    const restaurant = await this.restaurantModel.findById(restaurantId).exec();
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // If they are NOT an admin, enforce the vendor ownership check
    if (user.role !== UserRole.ADMIN) {
      const vendor = await this.vendorModel.findOne({ userId: user.sub }).exec();
      if (!vendor) {
        throw new ForbiddenException('No active vendor profile found.');
      }
      
      const vendorId = vendor.id || vendor._id.toString();
      if (restaurant.vendorId.toString() !== vendorId.toString()) {
        throw new ForbiddenException('You do not own this restaurant');
      }
    }

    // Toggle and save (works for both Admin and the authorized Vendor)
    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    return {
      id: restaurant._id.toString(),
      isActive: restaurant.isActive,
    };
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
      
      bannerImage: restaurant.bannerImage?.secure_url
        ? {
            url: restaurant.bannerImage.secure_url,
            publicId: restaurant.bannerImage.public_id,
          }
        : undefined,

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