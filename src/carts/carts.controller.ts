import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { CartsService } from './carts.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Controller('carts')
export class CartsController {
  constructor(private cartsService: CartsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCart(@Req() req) {
    return this.cartsService.getCart(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('items')
  async addItem(@Body() addDto: AddToCartDto, @Req() req) {
    return this.cartsService.addItem(req.user.sub, addDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('items/:productId')
  async updateItem(
    @Param('productId') productId: string,
    @Body() updateDto: UpdateCartItemDto,
    @Req() req,
  ) {
    return this.cartsService.updateItem(req.user.sub, productId, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:productId')
  async removeItem(@Param('productId') productId: string, @Req() req) {
    return this.cartsService.removeItem(req.user.sub, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async clearCart(@Req() req) {
    return this.cartsService.clearCart(req.user.sub);
  }
}
