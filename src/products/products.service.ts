import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../schemas/Product.schema';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) { }

  async create(createDto: CreateProductDto, restaurantId: string, file: Express.Multer.File) {
    const imageUrl = `/uploads/products/${file.filename}`;

    const product = new this.productModel({
      ...createDto,
      restaurantId,
      imageUrl,
    });

    return product.save();
  }

  async findByRestaurant(
    restaurantId: string,
    skip: number = 0,
    limit: number = 20,
  ) {
    return this.productModel
      .find({ restaurantId, isAvailable: true })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findById(id: string) {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async search(query: string, skip: number = 0, limit: number = 20) {
    return this.productModel
      .find(
        { $text: { $search: query }, isAvailable: true },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async update(id: string, restaurantId: string, updateDto: UpdateProductDto) {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenException(
        'You can only update products in your restaurant',
      );
    }
    return this.productModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  async delete(id: string, restaurantId: string) {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenException(
        'You can only delete products in your restaurant',
      );
    }
    return this.productModel.findByIdAndDelete(id).exec();
  }
}
