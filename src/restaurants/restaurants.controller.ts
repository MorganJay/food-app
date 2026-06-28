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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/User.schema';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto, UpdateRestaurantDto, RestaurantResponseDto } from './dto/restaurant.dto';
import { ParsedMultipartBody } from 'src/common/decorators/parsed-multipart-body.decorator';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all restaurants (paginated)' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'List of restaurants', type: [RestaurantResponseDto] })
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    return this.restaurantsService.findAll(parseInt(skip, 10), parseInt(limit, 10));
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby restaurants by location coords' })
  @ApiQuery({ name: 'latitude', required: true, type: Number, example: 7.3775 })
  @ApiQuery({ name: 'longitude', required: true, type: Number, example: 3.9470 })
  @ApiQuery({ name: 'radius', required: false, type: Number, example: 5 })
  @ApiResponse({ status: 200, description: 'Nearby restaurants list context matches' })
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
  @ApiOperation({ summary: 'Search active marketplace restaurants via full-text index parameters' })
  @ApiQuery({ name: 'q', required: true, example: 'Amala' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async search(
    @Query('q') query: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '10',
  ) {
    if (!query) {
      throw new BadRequestException('Search query string input parameter is required');
    }
    return this.restaurantsService.search(
      query,
      parseInt(skip, 10),
      parseInt(limit, 10),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant profile by id' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  @ApiResponse({ status: 200, type: RestaurantResponseDto })
  async findById(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create and setup store' })
  @ApiResponse({ status: 201, description: 'Restaurant profile created successfully', type: RestaurantResponseDto })
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @ParsedMultipartBody({
      objects: ['location'],
      arrays: ['categories', 'workingDays'],
    })
    createDto: CreateRestaurantDto, 
    @Req() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.restaurantsService.create(createDto, req.user.sub, file);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an existing vendor restaurant configuration settings profile' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  @ApiResponse({ status: 200, description: 'Restaurant updated successfully', type: RestaurantResponseDto })
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Req() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.restaurantsService.update(id, req.user.sub, updateDto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Purge a restaurant profile document and clear storage assets' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  @ApiResponse({ status: 200, description: 'Restaurant and storage properties successfully removed' })
  async delete(@Param('id') id: string, @Req() req) {
    return this.restaurantsService.delete(id, req.user.sub);
  }
}