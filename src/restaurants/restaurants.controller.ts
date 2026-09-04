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
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/User.schema';
import { RestaurantsService } from './restaurants.service';
import {
  CreateRestaurantDto,
  UpdateRestaurantDto,
  RestaurantResponseDto,
} from './dto/restaurant.dto';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all restaurants (paginated)' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of restaurants',
    type: [RestaurantResponseDto],
  })
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    return this.restaurantsService.findAll(
      parseInt(skip, 10),
      parseInt(limit, 10),
    );
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby restaurants by location coords' })
  @ApiQuery({ name: 'latitude', required: true, type: Number, example: 7.3775 })
  @ApiQuery({ name: 'longitude', required: true, type: Number, example: 3.947 })
  @ApiQuery({ name: 'radius', required: false, type: Number, example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Nearby restaurants list context matches',
  })
  async findNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius: string = '5',
  ) {
    return this.restaurantsService.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius, 10),
    );
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search active marketplace restaurants via full-text index parameters',
  })
  @ApiQuery({ name: 'q', required: true, example: 'Amala' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async search(
    @Query('q') query: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    if (!query) {
      throw new BadRequestException(
        'Search query string input parameter is required',
      );
    }
    return this.restaurantsService.search(
      query,
      parseInt(skip, 10),
      parseInt(limit, 10),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get all restaurants owned by the logged-in vendor' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved vendor restaurants' })
  async getMyRestaurants(@Req() req) {
    return this.restaurantsService.getRestaurantsByVendor(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant profile by id' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  @ApiResponse({ status: 200, type: RestaurantResponseDto })
  async findById(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @Patch(':id/toggle-status')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Toggle restaurant availability status (Admin or Vendor)' })
  @ApiResponse({ status: 200, description: 'Returns the updated availability state' })
  async toggleStatus(
    @Param('id') restaurantId: string,
    @Req() req,
  ) {
    return this.restaurantsService.toggleStatus(restaurantId, req.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiBody({
    description: 'Create restaurant payload (pure JSON)',
    type: CreateRestaurantDto,
  })
  @ApiOperation({ summary: 'Create and setup store' })
  @ApiResponse({
    status: 201,
    description: 'Restaurant profile created successfully',
    type: RestaurantResponseDto,
  })
  async create(@Body() createDto: CreateRestaurantDto, @Req() req) {
    return this.restaurantsService.create(createDto, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiBody({
    description: 'Update restaurant payload (pure JSON)',
    type: UpdateRestaurantDto,
  })
  @ApiOperation({
    summary: 'Update an existing vendor restaurant configuration settings profile',
  })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant updated successfully',
    type: RestaurantResponseDto,
  })
  async update(
    @Param('id') restaurantId: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Req() req,
  ) {
    return this.restaurantsService.update(restaurantId, req.user.sub, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Purge a restaurant profile document and clear storage assets',
  })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant and storage properties successfully removed',
  })
  async delete(@Param('id') restaurantId: string, @Req() req) {
    return this.restaurantsService.delete(restaurantId, req.user.sub);
  }
}