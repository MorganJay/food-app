import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../schemas/Restaurant.schema';
import { CreateRestaurantDto, RestaurantResponseDto, UpdateRestaurantDto } from './dto/restaurant.dto';
import { mapToGeoLocation } from 'src/common/geojson';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) { }

  async create(createDto: CreateRestaurantDto, vendorId: string) {
    const { address, latitude, longitude } = createDto.location;

    const restaurantData: any = {
      name: createDto.name,
      description: createDto.description,
      address,
      vendorId
    }

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

    return restaurants.map((restaurant) => this.mapRestaurantResponse(restaurant));
  }

  async findById(id: string) {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    return this.mapRestaurantResponse(restaurant);
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

    return restaurants.map((restaurant) => this.mapRestaurantResponse(restaurant));
  }

  async findByVendor(vendorId: string, skip: number = 0, limit: number = 10) {
    const restaurants = await this.restaurantModel
      .find({ vendorId })
      .skip(skip)
      .limit(limit)
      .exec();

    return restaurants.map((restaurant) => this.mapRestaurantResponse(restaurant));
  }

  async update(id: string, vendorId: string, updateDto: UpdateRestaurantDto) {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    if (restaurant.vendorId !== vendorId) {
      throw new ForbiddenException('You can only update your own restaurants');
    }

    const updatePayload: any = {};

    if (updateDto.name !== undefined) {
      updatePayload.name = updateDto.name;
    }

    if (updateDto.description !== undefined) {
      updatePayload.description = updateDto.description;
    }

    if (updateDto.isActive !== undefined) {
      updatePayload.isActive = updateDto.isActive;
    }

    // handle location transformation
    if (updateDto.location) {
      const { address, latitude, longitude } = updateDto.location;

      if (address) {
        updatePayload.address = address;
      }

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
    await this.restaurantModel.findByIdAndDelete(id).exec();

    return { status: "ok", message: "Restaurant deleted successfully" };
  }

  private mapRestaurantResponse(restaurant: any): RestaurantResponseDto {
    return {
      id: restaurant._id.toString(),
      name: restaurant.name,
      description: restaurant.description,
      vendorId: restaurant.vendorId,
      isActive: restaurant.isActive,
      location: {
        address: restaurant.address,
        latitude: restaurant.location?.coordinates?.[1],
        longitude: restaurant.location?.coordinates?.[0],
      },
      rating: restaurant.rating,
      reviewCount: restaurant.reviewCount,
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
    };
  }
}
