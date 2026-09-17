import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../schemas/Category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll() {
    const items = await this.categoryModel.find().sort({ name: 1 }).exec();
    return items.map((item) => this.mapCategoryResponse(item));
  }

  async create(name: string) {
    if (!name) {
      throw new BadRequestException('Category name parameter is missing.');
    }

    const cleanName = name.trim();

    const existing = await this.categoryModel.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') }
    }).exec();

    if (existing) {
      throw new ConflictException(`A category named "${cleanName}" already exists.`);
    }

    const newCategory = await this.categoryModel.create({
      name: cleanName
    });

    return this.mapCategoryResponse(newCategory);
  }

  async update(id: string, name: string) {
    const cleanName = name.trim();
    
    const duplicate = await this.categoryModel.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') }
    }).exec();

    if (duplicate) {
      throw new ConflictException('A category with this name already exists.');
    }

    const updated = await this.categoryModel
      .findByIdAndUpdate(id, { name: cleanName }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Category record not found');
    }

    return this.mapCategoryResponse(updated);
  }

  async remove(id: string) {
    const deleted = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Category record not found');
    }
    return { status: 'ok', message: 'Category deleted successfully' };
  }

  private mapCategoryResponse(category: CategoryDocument) {
    return {
      id: category._id.toString(),
      name: category.name,
      serialNumber: (category as any).serialNumber || null,
      createdAt: (category as any).createdAt,
    };
  }
}