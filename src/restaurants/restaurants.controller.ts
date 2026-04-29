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
import {  ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all restaurants (paginated)' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'List of restaurants' })
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    return this.restaurantsService.findAll(parseInt(skip), parseInt(limit));
  }

  @Get('search')
  @ApiOperation({ summary: 'Search restaurants' })
  @ApiQuery({ name: 'q', required: true, example: 'pizza' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async search(
    @Query('q') query: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    return this.restaurantsService.search(
      query,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant by ID' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  async findById(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Create a restaurant' })
  @ApiResponse({ status: 201, description: 'Restaurant created' })
  async create(@Body() createDto: CreateRestaurantDto, @Req() req) {
    return this.restaurantsService.create(createDto, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update a restaurant' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Req() req,
  ) {
    return this.restaurantsService.update(id, req.user.sub, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Delete a restaurant' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  async delete(@Param('id') id: string, @Req() req) {
    return this.restaurantsService.delete(id, req.user.sub);
  }
}
