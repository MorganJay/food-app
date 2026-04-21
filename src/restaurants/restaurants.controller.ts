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
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private restaurantsService: RestaurantsService) {}

  @Get()
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    return this.restaurantsService.findAll(parseInt(skip), parseInt(limit));
  }

  @Get('search')
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
  async findById(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createDto: CreateRestaurantDto, @Req() req) {
    return this.restaurantsService.create(createDto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Req() req,
  ) {
    return this.restaurantsService.update(id, req.user.sub, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    return this.restaurantsService.delete(id, req.user.sub);
  }
}
