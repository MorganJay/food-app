import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { FoodsService } from './foods.service';
import { CreateFoodDto, UpdateFoodDto } from './dto/foods.dto';

@ApiTags('Foods')
@Controller('foods')
export class FoodsController {
  constructor(private foodsService: FoodsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search foods by name' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.foodsService.search(query, parseInt(skip), parseInt(limit));
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get foods by vendor' })
  @ApiResponse({ status: 200, description: 'Vendor foods' })
  async findByVendor(
    @Param('vendorId') vendorId: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.foodsService.findByVendor(
      vendorId,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get food by ID' })
  @ApiParam({
    name: 'id',
    example: '677vdvd12345feusksh...',
    description: 'food ID',
  })
  @ApiResponse({ status: 200, description: 'Food details' })
  async findById(@Param('id') id: string) {
    return this.foodsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('vendor/:vendorId')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Create food item' })
  @ApiResponse({ status: 201, description: 'Food created' })
  async create(
    @Param('vendorId') vendorId: string,
    @Body() foodData: CreateFoodDto,
    @Req() req,
  ) {
    return this.foodsService.create(vendorId, foodData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update food item' })
  @ApiResponse({ status: 200, description: 'Food updated' })
  async update(@Param('id') id: string, @Body() updateData: UpdateFoodDto, @Req() req) {
    return this.foodsService.update(id, req.user.sub, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Delete food item (soft delete)' })
  @ApiResponse({ status: 200, description: 'Food deleted' })
  async delete(@Param('id') id: string, @Req() req) {
    return this.foodsService.delete(id, req.user.sub);
  }
}
