import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({
    description: 'Physical address of the restaurant',
    example: 'ikeja, Lagos State',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Latitude coordinate of the restaurant location',
    example: '7.3775',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    description: 'Longitude coordinate of the restaurant location',
    example: '3.947',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class CreateRestaurantDto {
  @ApiProperty({
    description: 'Name of the restaurant',
    example: 'Chicken Republic',
  })
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Detailed description of the restaurant',
    example: 'A fast-food restaurant specailizing in fried chicken meals',
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Restaurant location details',
    type: LocationDto,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ example: '8:00' })
  @IsString()
  openHours?: string;

  @ApiProperty({ example: '22:00' })
  @IsString()
  closeHours?: string;
}

export class UpdateRestaurantDto {
  @ApiProperty({
    description: 'Updated Name of the restaurant',
    example: 'KFC Bodija',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Updated description of the restaurant',
    example: 'Popular fast-food chain offering chicken and fries',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Updated address of the restaurant',
    example: 'mile 12, lagos state',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: true })
  isActive?: boolean;

  @ApiProperty({
    description: 'Restaurant location details',
    type: LocationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({ example: '8:00' })
  @IsString()
  openHours?: string;

  @ApiProperty({ example: '22:00' })
  @IsString()
  closeHours?: string;
}

export class RestaurantResponseDto {
  @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
  id: string;

  @ApiProperty({ example: 'Chicken Republic' })
  name: string;

  @ApiProperty({ example: 'Fast food restaurant serving meals' })
  description: string;

  @ApiProperty({ example: 'vendor123' })
  vendorId: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '8:00' })
  openHours?: string;

  @ApiProperty({ example: '22:00' })
  closeHours?: string;

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional()
  reviewCount?: number;

  @ApiProperty({ type: LocationDto })
  location: LocationDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ example: 1 })
  serialNumber: number;
}
