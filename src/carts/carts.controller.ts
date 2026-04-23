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
import {  ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { CartsService } from './carts.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@ApiTags('Carts')
@ApiBearerAuth('jwt')
@Controller('carts')
export class CartsController {
  constructor(private cartsService: CartsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(@Req() req) {
    return this.cartsService.getCart(req.user.sub);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addItem(@Body() addDto: AddToCartDto, @Req() req) {
    return this.cartsService.addItem(req.user.sub, addDto);
  }

  @Put('items/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({
    name: 'productId',
    example: 'prod_12345',
    description: 'ID of the product to update',
  })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  async updateItem(
    @Param('productId') productId: string,
    @Body() updateDto: UpdateCartItemDto,
    @Req() req,
  ) {
    return this.cartsService.updateItem(req.user.sub, productId, updateDto);
  }

  @Delete('items/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({
    name: 'productId',
    example: 'prod_12345',
    description: 'ID of the product to remove',
  })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async removeItem(@Param('productId') productId: string, @Req() req) {
    return this.cartsService.removeItem(req.user.sub, productId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  async clearCart(@Req() req) {
    return this.cartsService.clearCart(req.user.sub);
  }
}
