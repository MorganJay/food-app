import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../schemas/Product.schema';
import { CreateProductDto, ProductResponseDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) { }

  async create(createDto: CreateProductDto, file?: Express.Multer.File) {
    const name = createDto.name.trim();

    const existingProduct = await this.productModel.findOne({
      restaurantId: createDto.restaurantId,
      name: {
        $regex: `^${name}$`,
        $options: 'i',
      },
    });

    if (existingProduct) {
      throw new BadRequestException('Product already exists for this restaurant');
    }

    let image: string | undefined;

    if (file) {
      image = `/uploads/products/${file.filename}`;
    }

    const productData: any = {
      ...createDto,
      name,
    };

    // add image if exits
    if (image) {
      productData.image = image;
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

    return products.map(product => this.mapProductResponse(product));
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

    return products.map(product => this.mapProductResponse(product));
  }

  async update(id: string, restaurantId: string, updateDto: UpdateProductDto, file?: Express.Multer.File) {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    if (product.restaurantId.toString() !== restaurantId) {
      throw new ForbiddenException(
        'You can only update products in your restaurant',
      );
    }

    const updatePayload: any = { ...updateDto };

    if (updatePayload.name) {
      updatePayload.name = updatePayload.name.trim();
    }

    if (file) {
      updatePayload.image = `/uploads/products/${file.filename}`;
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();

    return this.mapProductResponse(updatedProduct);
  }

  async delete(id: string, restaurantId: string): Promise<{ status: string; message: string }> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenException(
        'You can only delete products in your restaurant',
      );
    }
    await this.productModel.findByIdAndDelete(id).exec();

    return { status: "ok", message: "Product deleted successfully" };
  }

  private mapProductResponse(product: any): ProductResponseDto {
    return {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      prepTime: product.prepTime,
      category: product.category,
      image: product.image,
      isAvailable: product.isAvailable,
      restaurantId: product.restaurantId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      serialNumber: product.serialNumber,
    };
  }
}
