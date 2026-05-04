import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';

export class CreateFoodDto {
  @ApiProperty({
    example: 'Jollof Rice',
    description: 'Name of the food item',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'plate',
    description: 'Unit of measurement (e.g. plate, pack, bottle)',
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    example: 2500,
    description: 'Price of the food item',
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({
    example: 'Main Course',
    description: 'Food category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 20,
    description: 'Preparation time in minutes',
  })
  @IsOptional()
  @IsNumber()
  prepTime?: number;

  @ApiPropertyOptional({
    example: 'https://example.com/image.jpg',
    description: 'Image URL of the food item',
  })
  @IsOptional()
  @IsString()
  image?: string;
}

export class UpdateFoodDto {
  @ApiPropertyOptional({ example: 'Fried Rice' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'plate' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ example: 'Main Course' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  prepTime?: number;

  @ApiPropertyOptional({ example: 'https://example.com/new-image.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    example: 'available',
    description: 'Food availability status',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class FoodResponseDto {
  @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
  id: string;

  @ApiProperty({ example: 'Jollof Rice' })
  name: string;

  @ApiProperty({ example: 'plate' })
  unit: string;

  @ApiProperty({ example: 2500 })
  price: number;

  @ApiPropertyOptional({ example: 'Main Course' })
  category?: string;

  @ApiPropertyOptional({ example: 20 })
  prepTime?: number;

  @ApiPropertyOptional({
    example: 'https://your-cdn.com/uploads/jollof.jpg',
  })
  image?: string;

  @ApiPropertyOptional({
    example: 'available',
    description: 'Food availability status',
  })
  status?: string;

  @ApiProperty({ example: '67restaurantId123' })
  restaurantId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}