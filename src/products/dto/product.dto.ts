import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    example: 'Cheese Burger',
    description: 'Name of the food product',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'A juicy beef burger topped with cheddar cheese and fresh lettuce',
    description: 'Detailed description of the food product',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: 3500,
    description: 'Price of the food product in local currency',
  })
  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional({
    example: 'Fast Food',
    description: 'Category of the food product',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Product image file',
  })
  image?: any;
}

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'Double Cheese Burger',
    description: 'Updated name of the food product',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'A larger burger with double beef patties and extra cheese',
    description: 'Updated description of the food product',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 4500,
    description: 'Updated price of the food product',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({
    example: 'Grilled Specials',
    description: 'Updated category of the food product',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/double-cheese-burger.jpg',
    description: 'Updated image URL',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Availability status of the food product',
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}


export class ProductResponseDto {
  @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
  id: string;

  @ApiProperty({ example: 'Cheese Burger' })
  name: string;

  @ApiProperty({
    example: 'A juicy beef burger topped with cheddar cheese and fresh lettuce',
  })
  description: string;

  @ApiProperty({ example: 3500 })
  price: number;

  @ApiPropertyOptional({ example: 'Fast Food' })
  category?: string;

  @ApiPropertyOptional({
    example: 'https://your-cdn.com/uploads/burger.jpg',
  })
  image?: string;

  @ApiPropertyOptional({ example: true })
  isAvailable?: boolean;

  @ApiProperty({ example: '67vendorId123' })
  restaurantId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}