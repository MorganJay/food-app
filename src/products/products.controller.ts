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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products (paginated)' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'List of products' })
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    return this.productsService.findAll(parseInt(skip, 10), parseInt(limit, 10));
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for products by keyword' })
  @ApiQuery({ name: 'q', required: true, example: 'Burger' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async search(
    @Query('q') query: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    return this.productsService.search(query, parseInt(skip, 10), parseInt(limit, 10));
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get products by restaurant ID' })
  async findByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.productsService.findByRestaurant(
      restaurantId,
      parseInt(skip, 10),
      parseInt(limit, 10),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('restaurant')
  @ApiBearerAuth('jwt')
  @ApiBody({ type: CreateProductDto })
  @ApiOperation({ summary: 'Create a new product for a restaurant (pure JSON)' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req,
  ) {
    return this.productsService.create(createProductDto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth('jwt')
  @ApiBody({ type: UpdateProductDto })
  @ApiOperation({ summary: 'Update a product (pure JSON)' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductDto,
    @Req() req,
  ) {
    return this.productsService.update(id, req.user.sub, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Delete a product' })
  async delete(@Param('id') id: string, @Req() req) {
    return this.productsService.delete(id, req.user.sub);
  }
}