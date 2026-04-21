import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    return this.productsService.search(query, parseInt(skip), parseInt(limit));
  }

  @Get('restaurant/:restaurantId')
  async findByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.productsService.findByRestaurant(
      restaurantId,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('restaurant/:restaurantId')
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() createDto: CreateProductDto,
    @Req() req,
  ) {
    return this.productsService.create(createDto, restaurantId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductDto,
    @Req() req,
  ) {
    return this.productsService.update(id, req.user.sub, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    return this.productsService.delete(id, req.user.sub);
  }
}
