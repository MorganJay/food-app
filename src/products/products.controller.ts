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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/config/multer.config';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) { }

  @Get('search')
  @ApiOperation({ summary: 'Search for products by keyword' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search keyword',
    example: 'Burger',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of records to return',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Products fetched successfully' })
  @ApiResponse({ status: 400, description: 'Search query is required' })
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
  @ApiOperation({ summary: 'Get products by restaurant ID' })
  @ApiParam({
    name: 'restaurantId',
    description: 'Restaurant unique ID',
    example: '67ab12cd34ef56gh78ij90kl',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of records to return',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurant products fetched successfully',
  })
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
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({
    name: 'id',
    description: 'Product unique ID',
    example: '67ab12cd34ef56gh78ij90kl',
  })
  @ApiResponse({ status: 200, description: 'Product fetched successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('restaurant/:restaurantId')
  @ApiBearerAuth('jwt')
  @UseInterceptors(FileInterceptor('image', multerConfig('products')))
  @ApiOperation({ summary: 'Create a new product for a restaurant' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'restaurantId',
    description: 'Restaurant unique ID',
    example: '67ab12cd34ef56gh78ij90kl',
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() createDto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.productsService.create(createDto, restaurantId, file);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({
    name: 'id',
    description: 'Product unique ID',
    example: '67ab12cd34ef56gh78ij90kl',
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
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
  @ApiParam({
    name: 'id',
    description: 'Product unique ID',
    example: '67ab12cd34ef56gh78ij90kl',
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(@Param('id') id: string, @Req() req) {
    return this.productsService.delete(id, req.user.sub);
  }
}