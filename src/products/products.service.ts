import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../schemas/Product.schema';
import { Restaurant, RestaurantDocument } from '../schemas/Restaurant.schema';
import {
  CreateProductDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto/product.dto';
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  private async assertRestaurantOwnedByVendor(
    restaurantId: string,
    vendorUserId: string,
  ) {
    const restaurant = await this.restaurantModel.findById(restaurantId).exec();
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    if (restaurant.vendorId !== vendorUserId) {
      throw new ForbiddenException('You do not own this restaurant');
    }
  }

  async create(
    createDto: CreateProductDto,
    vendorUserId: string,
    file?: Express.Multer.File,
  ) {
    await this.assertRestaurantOwnedByVendor(
      createDto.restaurantId,
      vendorUserId,
    );

    const name = createDto.name.trim();

    const existingProduct = await this.productModel.findOne({
      restaurantId: createDto.restaurantId,
      name: {
        $regex: `^${name}$`,
        $options: 'i',
      },
    });

    if (existingProduct) {
      throw new BadRequestException(
        'Product already exists for this restaurant',
      );
    }

    const productData: Record<string, unknown> = {
      ...createDto,
      name,
    };

    if (file) {
      const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );

        stream.end(file.buffer);
      });

      productData.image = {
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      };
    }

    const product = await this.productModel.create(productData);

    return this.mapProductResponse(product);
  }

  async findAll(skip: number = 0, limit: number = 10) {
    const products = await this.productModel
      .find({ isAvailable: true })
      .skip(skip)
      .limit(limit)
      .exec();

    return products.map((product) => this.mapProductResponse(product));
  }

  async findByRestaurant(
    restaurantId: string,
    skip: number = 0,
    limit: number = 20,
  ) {
    const products = await this.productModel
      .find({ restaurantId, isAvailable: true })
      .skip(skip)
      .limit(limit)
      .exec();

    return products.map((product) => this.mapProductResponse(product));
  }

  async findById(id: string) {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.mapProductResponse(product);
  }

  async search(query: string, skip: number = 0, limit: number = 20) {
    const products = await this.productModel
      .find(
        { $text: { $search: query }, isAvailable: true },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .exec();

    return products.map((product) => this.mapProductResponse(product));
  }

  async update(
    id: string,
    vendorUserId: string,
    updateDto: UpdateProductDto,
    file?: Express.Multer.File,
  ) {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.assertRestaurantOwnedByVendor(
      product.restaurantId.toString(),
      vendorUserId,
    );

    const updatePayload: Record<string, unknown> = { ...updateDto };

    if (updateDto.name) {
      updatePayload.name = (updateDto.name as string).trim();
    }

    if (file) {
      // delete old image first
      if (product.image?.public_id) {
        await cloudinary.uploader.destroy(product.image.public_id);
      }

      // upload new image
      const uploaded = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );

        stream.end(file.buffer);
      });

      updatePayload.image = {
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      };
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.mapProductResponse(updatedProduct);
  }

  async delete(
    id: string,
    vendorUserId: string,
  ): Promise<{ status: string; message: string }> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.assertRestaurantOwnedByVendor(
      product.restaurantId.toString(),
      vendorUserId,
    );
    await this.productModel.findByIdAndDelete(id).exec();

    return { status: 'ok', message: 'Product deleted successfully' };
  }

  private mapProductResponse(product: ProductDocument): ProductResponseDto {
    return {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      prepTime: product.prepTime,
      category: product.category,
      image: product.image?.secure_url,
      isAvailable: product.isAvailable,
      restaurantId: product.restaurantId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      serialNumber: product.serialNumber,
    };
  }
}
