import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/Cart.schema';
import { AddToCartDto, CartResponseDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartsService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<CartDocument>) { }

  async getCart(userId: string) {
    let cart = await this.cartModel
      .findOne({ userId, isDeleted: false })
      .exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [], total: 0 });
      await cart.save();
    }
    return this.mapCartResponse(cart);
  }

  async addItem(userId: string, addDto: AddToCartDto) {
    let cart = await this.cartModel
      .findOne({ userId, isDeleted: false })
      .exec();
    if (!cart) {
      cart = new this.cartModel({
        userId,
        restaurantId: addDto.restaurantId,
        items: [],
        total: 0,
      });
    }

    if (cart.restaurantId && cart.restaurantId !== addDto.restaurantId) {
      throw new BadRequestException(
        'Cannot add items from different restaurants to the same cart',
      );
    }

    if (!cart.restaurantId) {
      cart.restaurantId = addDto.restaurantId;
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === addDto.productId,
    );

    if (existingItem) {
      existingItem.quantity += addDto.quantity;
    } else {
      cart.items.push({
        productId: addDto.productId,
        quantity: addDto.quantity,
        price: addDto.price,
        name: addDto.name,
      });
    }

    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const savedCart = await cart.save();
    return this.mapCartResponse(savedCart);
  }

  async updateItem(
    userId: string,
    productId: string,
    updateDto: UpdateCartItemDto,
  ) {
    const cart = await this.cartModel.findOne({ userId }).exec();
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
    }

    cart.total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const savedCart = await cart.save();
    return this.mapCartResponse(savedCart);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);

    if (cart.items.length === 0) {
      cart.total = 0;
    } else {
      cart.total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    const savedCart = await cart.save();
    return this.mapCartResponse(savedCart);
  }

  async clearCart(userId: string) {
    const cart = await this.cartModel.findOneAndUpdate(
      { userId },
      { items: [], total: 0, restaurantId: null,},
      { new: true },
    );

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.mapCartResponse(cart);
  }

  private mapCartResponse(cart: CartDocument): CartResponseDto {
    return {
      id: cart._id.toString(),
      serialNumber: cart.serialNumber,
      userId: cart.userId,
      restaurantId: cart.restaurantId,

      items: cart.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: item.price,
        name: item.name,
      })),

      total: cart.total,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
