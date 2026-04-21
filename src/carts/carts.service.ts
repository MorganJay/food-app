import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/Cart.schema';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartsService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<CartDocument>) {}

  async getCart(userId: string) {
    let cart = await this.cartModel
      .findOne({ userId, isDeleted: false })
      .exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [], total: 0 });
      await cart.save();
    }
    return cart;
  }

  async addItem(userId: string, addDto: AddToCartDto) {
    let cart = await this.cartModel
      .findOne({ userId, isDeleted: false })
      .exec();
    if (!cart) {
      cart = new this.cartModel({
        userId,
        vendorId: addDto.vendorId,
        items: [],
        total: 0,
      });
    }

    if (cart.vendorId && cart.vendorId !== addDto.vendorId) {
      throw new BadRequestException(
        'Cannot add items from different vendors to the same cart',
      );
    }

    if (!cart.vendorId) {
      cart.vendorId = addDto.vendorId;
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
    return cart.save();
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
    return cart.save();
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

    return cart.save();
  }

  async clearCart(userId: string) {
    return this.cartModel.findOneAndUpdate(
      { userId },
      { items: [], total: 0 },
      { new: true },
    );
  }
}
