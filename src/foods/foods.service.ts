import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Food, FoodDocument } from '../schemas/Food.schema';

@Injectable()
export class FoodsService {
  constructor(@InjectModel(Food.name) private foodModel: Model<FoodDocument>) {}

  async findByVendor(vendorId: string, skip: number = 0, limit: number = 20) {
    return this.foodModel.find({ vendorId }).skip(skip).limit(limit).exec();
  }

  async findById(id: string) {
    const food = await this.foodModel.findById(id).exec();
    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }
    return food;
  }

  async search(query: string, skip: number = 0, limit: number = 20) {
    return this.foodModel
      .find({ $text: { $search: query } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async create(vendorId: string, foodData: any) {
    const food = new this.foodModel({
      ...foodData,
      vendorId,
    });
    return food.save();
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
    return this.foodModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string, vendorId: string) {
    const food = await this.foodModel.findById(id).exec();
    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }
    if (food.vendorId !== vendorId) {
      throw new BadRequestException(
        'You can only delete foods from your vendor',
      );
    }
    return this.foodModel.findByIdAndDelete(id).exec();
  }
}
