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
import { deleteFromCloudinary, uploadToCloudinary } from 'src/common/utils/cloudinary.util';

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

 private parseChoiceGroups(choiceGroupsInput: any): any[] {
    if (!choiceGroupsInput) return [];
    
    let parsed = choiceGroupsInput;
    
    // If it arrives as a string from FormData, parse it manually
    if (typeof choiceGroupsInput === 'string') {
      try {
        parsed = JSON.parse(choiceGroupsInput);
      } catch (error) {
        throw new BadRequestException('Invalid JSON format for choiceGroups');
      }
    }

    if (!Array.isArray(parsed)) return [];

    // Explicit structural mapping to match Mongoose Schema exactly
    return parsed.map((group) => ({
      groupName: group.groupName,
      isRequired: group.isRequired === 'true' || group.isRequired === true,
      options: Array.isArray(group.options)
        ? group.options.map((opt) => ({
            name: opt.name,
            price: Number(opt.price) || 0,
          }))
        : [],
    }));
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
      restaurantId: createDto.restaurantId,
      name,
      description: createDto.description,
      price: createDto.price,
      unit: createDto.unit,
      prepTime: createDto.prepTime,
      category: createDto.category,
      isAvailable: createDto.isAvailable,
      choiceGroups: this.parseChoiceGroups(createDto.choiceGroups),
    };

    if (file) {
      const uploaded = await uploadToCloudinary(file, 'products');
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
      if (product.image?.public_id) {
        await deleteFromCloudinary(product.image.public_id);
      }

      const uploaded = await uploadToCloudinary(file, 'products');
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
    if (product.image?.public_id) {
      await deleteFromCloudinary(product.image.public_id);
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
      choiceGroups: product.choiceGroups || [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      serialNumber: product.serialNumber,
    };
  }
}
