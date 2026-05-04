import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Food, FoodDocument } from '../schemas/Food.schema';
import { FoodResponseDto } from './dto/foods.dto';

@Injectable()
export class FoodsService {
  constructor(@InjectModel(Food.name) private foodModel: Model<FoodDocument>) { }

  async findByVendor(vendorId: string, skip: number = 0, limit: number = 20) {
    const foods = await this.foodModel.find({ vendorId }).skip(skip).limit(limit).exec();
    return foods.map(food => this.mapFoodResponse(food));
  }

  async findById(id: string) {
    const food = await this.foodModel.findById(id).exec();
    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }
    return this.mapFoodResponse(food);
  }

  async search(query: string, skip: number = 0, limit: number = 20) {
    const foods = await this.foodModel
      .find({ $text: { $search: query } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .exec();

    return foods.map(food => this.mapFoodResponse(food));
  }

  async create(vendorId: string, foodData: any) {
    const food = await this.foodModel.create({
      ...foodData,
      vendorId,
    });
    return this.mapFoodResponse(food);
  }

  async update(id: string, vendorId: string, updateData: any) {
    const food = await this.foodModel.findById(id).exec();
    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }
    if (food.vendorId !== vendorId) {
      throw new BadRequestException(
        'You can only update foods from your vendor',
      );
    }
    const updatedFood = await this.foodModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    return this.mapFoodResponse(updatedFood);
  }

  async delete(id: string, vendorId: string): Promise<{ status: string; message: string }> {
    const food = await this.foodModel.findById(id).exec();
    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }
    if (food.vendorId !== vendorId) {
      throw new BadRequestException(
        'You can only delete foods from your vendor',
      );
    }
    this.foodModel.findByIdAndDelete(id).exec();

    return { status: "ok", message: "Food deleted successfully" };
  }

  private mapFoodResponse(food: any): FoodResponseDto {
    return {
      id: food._id.toString(),
      name: food.name,
      unit: food.unit,
      price: food.price,
      category: food.category,
      prepTime: food.prepTime,
      image: food.image,
      status: food.status,
      restaurantId: food.restaurantId,
      createdAt: food.createdAt,
      updatedAt: food.updatedAt,
    };
  }
}
