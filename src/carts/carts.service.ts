import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/Cart.schema';
import { AddToCartDto, CartResponseDto, UpdateCartItemDto } from './dto/cart.dto';
import { Product } from 'src/schemas/Product.schema';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async getCart(userId: string) {
    let cart = await this.cartModel
      .findOne({ userId, isDeleted: false })
      .exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [], total: 0, restaurantId: null });
      await cart.save();
    }
    return this.mapCartResponse(cart);
  }

  async addItem(userId: string, addDto: AddToCartDto) {
    const product = await this.productModel.findById(addDto.productId).exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let cart = await this.cartModel
      .findOne({ userId, isDeleted: false })
      .exec();

    const restaurantId = product.restaurantId;

    if (!restaurantId) {
      throw new BadRequestException('Product has no restaurant assigned');
    }

    if (!cart) {
      cart = new this.cartModel({
        userId,
        restaurantId,
        items: [],
        total: 0,
      });
    }

    if (cart.restaurantId && cart.restaurantId.toString() !== restaurantId.toString()) {
      throw new BadRequestException(
        'Cannot add items from different restaurants to the same cart',
      );
    }

    if (!cart.restaurantId) {
      cart.restaurantId = restaurantId;
    }

    const incomingChoices = addDto.selectedChoices || [];

    const existingItem = cart.items.find((item) => {
      if (item.productId.toString() !== addDto.productId) return false;
      
      const itemChoices = (item as any).selectedChoices || [];
      if (itemChoices.length !== incomingChoices.length) return false;

      return incomingChoices.every((incoming) =>
        itemChoices.some(
          (existing: any) =>
            existing.name === incoming.name && existing.price === incoming.price,
        ),
      );
    });

    if (existingItem) {
      existingItem.quantity += addDto.quantity;
      // Recalculate subtotal for this item
      existingItem.subtotal = this.calculateItemSubtotal(existingItem);
    } else {
      // Map safe image schema if it exists on the product
      const itemImage = product.image?.secure_url
        ? { url: product.image.secure_url, publicId: product.image.public_id }
        : undefined;

      const newItem: any = {
        productId: addDto.productId,
        quantity: addDto.quantity,
        price: product.price,
        name: product.name,
        image: itemImage,
        selectedChoices: incomingChoices,
      };

      // Calculate initial subtotal
      newItem.subtotal = this.calculateItemSubtotal(newItem);
      cart.items.push(newItem);
    }

    // Accumulate total from each calculated item subtotal
    cart.total = this.calculateTotal(cart.items);
    
    const savedCart = await cart.save();
    return this.mapCartResponse(savedCart);
  }

  async updateItem(
    userId: string,
    productId: string,
    updateDto: UpdateCartItemDto,
  ) {
    const cart = await this.cartModel.findOne({ userId, isDeleted: false }).exec();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.items.find((i) => i.productId.toString() === productId);

    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    if (updateDto.quantity <= 0) {
      cart.items = cart.items.filter(
        (i) => i.productId.toString() !== productId,
      );
    } else {
      item.quantity = updateDto.quantity;
      // Recalculate subtotal for updated item
      item.subtotal = this.calculateItemSubtotal(item);
    }

    cart.total = this.calculateTotal(cart.items);
    
    const savedCart = await cart.save();
    return this.mapCartResponse(savedCart);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.cartModel.findOne({ userId, isDeleted: false }).exec();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);

    if (cart.items.length === 0) {
      cart.total = 0;
      cart.restaurantId = null;
    } else {
      cart.total = this.calculateTotal(cart.items);
    }

    const savedCart = await cart.save();
    return this.mapCartResponse(savedCart);
  }

  async clearCart(userId: string) {
    const cart = await this.cartModel.findOneAndUpdate(
      { userId, isDeleted: false },
      { items: [], total: 0, restaurantId: null },
      { new: true },
    );

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.mapCartResponse(cart);
  }

  // Helper method to calculate an individual item subtotal
  private calculateItemSubtotal(item: any): number {
    const choicesCost = Array.isArray(item.selectedChoices)
      ? item.selectedChoices.reduce((choiceSum: number, choice: any) => choiceSum + (Number(choice.price) || 0), 0)
      : 0;
    return (item.price + choicesCost) * item.quantity;
  }

  // Calculates overall total based on previously resolved individual subtotals
  private calculateTotal(items: any[]): number {
    return items.reduce((sum, item) => sum + (item.subtotal || this.calculateItemSubtotal(item)), 0);
  }

  private mapCartResponse(cart: CartDocument): CartResponseDto {
    return {
      id: cart._id.toString(),
      serialNumber: cart.serialNumber,
      restaurantId: cart.restaurantId,

      items: cart.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        subtotal: item.subtotal || this.calculateItemSubtotal(item), // Fallback calculation if database has legacy items
        image: item.image?.url
          ? {
              url: item.image.url,
              publicId: item.image.publicId,
            }
          : undefined,
        selectedChoices: ((item as any).selectedChoices || []).map((choice: any) => ({
          groupName: choice.groupName || 'Options',
          name: choice.name,
          price: choice.price,
        })),
      })),

      total: cart.total,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}