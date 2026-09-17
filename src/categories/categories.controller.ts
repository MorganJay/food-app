import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiProperty, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/User.schema';
import { IsNotEmpty, IsString } from 'class-validator';

class CreateCategoryDto {
  @ApiProperty({ 
    example: 'Soups', 
    description: 'Add food category (e.g., Soups, Swallows, Drinks)' 
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

class UpdateCategoryDto {
  @ApiProperty({ 
    example: 'Swallows', 
    description: 'The updated name for the category profile record' 
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

class CategoryResponseDto {
  @ApiProperty({ example: '64f123abc1234567890efabc', description: 'The MongoDB Hex ObjectId' })
  id: string;

  @ApiProperty({ example: 'Soups' })
  name: string;

  @ApiProperty({ example: '2026-06-24T15:30:00.000Z' })
  createdAt: string;
}

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories for selection dropdowns' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto], description: 'List of active categories' })
  async getAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Add a new category name' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, type: CategoryResponseDto, description: 'Category created successfully' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto.name);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update an existing category name' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, type: CategoryResponseDto, description: 'Category updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto.name);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Remove a category from the global directory' })
  @ApiParam({ name: 'id', example: '64f123abc...' })
  @ApiResponse({ status: 200, description: 'Category successfully cleared from the collection tree schema' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}