import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../schemas/Restaurant.schema';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async create(createDto: CreateRestaurantDto, vendorId: string) {
    const restaurant = new this.restaurantModel({
      ...createDto,
      vendorId,
    });
    return restaurant.save();
  }

  async findAll(skip: number = 0, limit: number = 10) {
    return this.restaurantModel
      .find({ isActive: true })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findById(id: string) {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    return restaurant;
  }

  async search(query: string, skip: number = 0, limit: number = 10) {
    return this.restaurantModel
      .find(
        { $text: { $search: query }, isActive: true },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findByVendor(vendorId: string, skip: number = 0, limit: number = 10) {
    return this.restaurantModel
      .find({ vendorId })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async update(id: string, vendorId: string, updateDto: UpdateRestaurantDto) {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    if (restaurant.vendorId !== vendorId) {
      throw new ForbiddenException('You can only update your own restaurants');
    }
    return this.restaurantModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  async delete(id: string, vendorId: string) {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    if (restaurant.vendorId !== vendorId) {
      throw new ForbiddenException('You can only delete your own restaurants');
    }
    return this.restaurantModel.findByIdAndDelete(id).exec();
  }
}
