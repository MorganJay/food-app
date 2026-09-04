import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({
    description: 'Physical address text details of the restaurant',
    example: 'Ikeja, Lagos State',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Latitude coordinate of the restaurant location',
    example: 7.3775,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    description: 'Longitude coordinate of the restaurant location',
    example: 3.947,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class ImagePayloadDto {
  @ApiProperty({
    description: 'Secure Cloudinary URL of the image',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234/restaurants/banner.jpg',
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Cloudinary public asset ID',
    example: 'restaurants/banner_abc123',
  })
  @IsString()
  @IsOptional()
  publicId?: string;
}

export class CreateRestaurantDto {
  @ApiProperty({
    description: 'Name of the restaurant',
    example: 'Chicken Republic',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Detailed description of the restaurant',
    example: 'A fast-food restaurant specializing in fried chicken meals',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Restaurant location details parameters',
    type: LocationDto,
    required: true,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({
    example: '08:00',
    description: 'Opening operational hours',
    required: false,
  })
  @IsString()
  @IsOptional()
  openHours?: string;

  @ApiProperty({
    example: '22:00',
    description: 'Closing operational hours',
    required: false,
  })
  @IsString()
  @IsOptional()
  closeHours?: string;

  @ApiProperty({
    example: ['Swallow', 'Rice', 'Soups', 'Proteins', 'Local Dishes'],
    type: [String],
    description: 'Select food categories',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({
    example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[];

  @ApiProperty({ example: 'same day delivery', required: false })
  @IsString()
  @IsOptional()
  orderType?: string;

  @ApiProperty({
    description: 'The uploaded banner image asset parameters returned from the utility upload API',
    type: ImagePayloadDto,
  })
  @ValidateNested()
  @Type(() => ImagePayloadDto)
  bannerImage: ImagePayloadDto;
}

export class UpdateRestaurantDto {
  @ApiProperty({ example: 'KFC Bodija', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Popular fast-food chain offering chicken and fries',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: LocationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({ example: '08:00', required: false })
  @IsOptional()
  @IsString()
  openHours?: string;

  @ApiProperty({ example: '22:00', required: false })
  @IsOptional()
  @IsString()
  closeHours?: string;

  @ApiProperty({
    example: ['Swallow', 'Fast Food'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({
    example: ['Monday', 'Tuesday', 'Wednesday'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[];

  @ApiProperty({ example: 'same day delivery', required: false })
  @IsString()
  @IsOptional()
  orderType?: string;

  @ApiPropertyOptional({
    description: 'Update banner image asset parameters',
    type: ImagePayloadDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImagePayloadDto)
  bannerImage?: ImagePayloadDto;
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

  @ApiProperty({ type: ImagePayloadDto })
  bannerImage: ImagePayloadDto;

  @ApiProperty({ example: ['Swallow', 'Burgers'] })
  categories: string[];

  @ApiProperty({ example: ['Monday', 'Tuesday'] })
  workingDays: string[];

  @ApiProperty({ example: 'same day delivery' })
  orderType?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '08:00' })
  openHours: string;

  @ApiProperty({ example: '22:00' })
  closeHours: string;

  @ApiPropertyOptional({ example: 4.5 })
  rating?: number;

  @ApiPropertyOptional({ example: 24 })
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