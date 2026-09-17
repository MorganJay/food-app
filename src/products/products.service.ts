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
import { deleteFromCloudinary } from 'src/common/utils/cloudinary.util';
import { Vendor, VendorDocument } from 'src/schemas/Vendor.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
  ) {}

  private async getVendorIdByUserId(userId: string): Promise<string> {
    const vendorProfile = await this.vendorModel.findOne({ userId }).exec();
    if (!vendorProfile) {
      throw new ForbiddenException('No active vendor profile record found for this user context.');
    }
    return vendorProfile.id || vendorProfile._id.toString();
  }

  private async assertRestaurantOwnedByVendor(
    restaurantId: string,
    vendorId: string,
  ) {
    const restaurant = await this.restaurantModel.findById(restaurantId).exec();
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    
    // Safely compare raw strings instead of mismatched types
    if (restaurant.vendorId.toString() !== vendorId.toString()) {
      throw new ForbiddenException('You do not own this restaurant');
    }
  }

  private parseChoiceGroups(choiceGroupsInput: any[]): any[] {
    if (!choiceGroupsInput) return [];
    
    let parsed = choiceGroupsInput;
    
    if (typeof choiceGroupsInput === 'string') {
      try {
        parsed = JSON.parse(choiceGroupsInput);
      } catch (error) {
        throw new BadRequestException('Invalid JSON format for choiceGroups');
      }
    }

    if (!Array.isArray(parsed)) return [];

    return parsed.map((group) => ({
      groupName: group.groupName,
      isRequired: group.isRequired === 'true' || group.isRequired === true,
      options: Array.isArray(group.options)
        ? group.options.map((opt: any) => ({
            name: opt.name,
            price: Number(opt.price) || 0,
          }))
        : [],
    }));
  }

  async create(createDto: CreateProductDto, userId: string) {
    const vendorId = await this.getVendorIdByUserId(userId);
    
    await this.assertRestaurantOwnedByVendor(
      createDto.restaurantId,
      vendorId,
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

    const productData: Record<string, any> = {
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

    if (createDto.image) {
      productData.image = {
        secure_url: createDto.image.url.trim(),
        public_id: createDto.image.publicId?.trim(),
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

  async update(productId: string, userId: string, updateDto: UpdateProductDto) {
    const vendorId = await this.getVendorIdByUserId(userId);
    
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    await this.assertRestaurantOwnedByVendor(
      product.restaurantId.toString(),
      vendorId,
    );

    const updatePayload: Record<string, any> = {};

    if (updateDto.name !== undefined) updatePayload.name = updateDto.name.trim();
    if (updateDto.description !== undefined) updatePayload.description = updateDto.description;
    if (updateDto.price !== undefined) updatePayload.price = updateDto.price;
    if (updateDto.unit !== undefined) updatePayload.unit = updateDto.unit;
    if (updateDto.prepTime !== undefined) updatePayload.prepTime = updateDto.prepTime;
    if (updateDto.category !== undefined) updatePayload.category = updateDto.category;
    if (updateDto.isAvailable !== undefined) updatePayload.isAvailable = updateDto.isAvailable;
    
    if (updateDto.choiceGroups !== undefined) {
      updatePayload.choiceGroups = this.parseChoiceGroups(updateDto.choiceGroups);
    }

    // Map the pre-uploaded image update safely if provided
    if (updateDto.image) {
      if (updateDto.image.publicId && product.image?.public_id) {
        // Only run deletion if there's an existing image publicId to clean up
        await deleteFromCloudinary(product.image.public_id).catch((err) =>
          console.error('Failed to delete old product image from Cloudinary:', err),
        );

        updatePayload.image = {
          secure_url: updateDto.image.url.trim(),
          public_id: updateDto.image.publicId.trim(),
        };
      } else if (updateDto.image.url) {
        updatePayload.image = {
          secure_url: updateDto.image.url.trim(),
          public_id: product.image?.public_id || '',
        };
      }
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(productId, updatePayload, { new: true })
      .exec();
    
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    return this.mapProductResponse(updatedProduct);
  }

  async delete(productId: string, userId: string): Promise<{ status: string; message: string }> {
    const vendorId = await this.getVendorIdByUserId(userId);
    
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    // Safety verification check prior to cloud asset clearing
    await this.assertRestaurantOwnedByVendor(
      product.restaurantId.toString(),
      vendorId,
    );

    if (product.image?.public_id) {
      await deleteFromCloudinary(product.image.public_id).catch((err) =>
        console.error('Failed to remove image from Cloudinary:', err)
      );
    }
    
    await this.productModel.findByIdAndDelete(productId).exec();

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
      image: product.image?.secure_url
        ? {
            url: product.image.secure_url,
            publicId: product.image.public_id,
          }
        : undefined,
      isAvailable: product.isAvailable,
      restaurantId: product.restaurantId.toString(),
      choiceGroups: product.choiceGroups || [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      serialNumber: product.serialNumber,
    };
  }
}