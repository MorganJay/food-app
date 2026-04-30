import { IsNotEmpty, IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';


class LocationDto {
  @ApiProperty({
    description: 'Physical address of the restaurant',
    example: 'ikeja, Lagos State'
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
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Detailed description of the restaurant',
    example: 'A fast-food restaurant specailizing in fried chicken meals',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Restaurant location details',
    type: LocationDto,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}

export class UpdateRestaurantDto {
  @ApiProperty({
    description: 'Updated Name of the restaurant',
    example: 'KFC Bodija',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Updated description of the restaurant',
    example: 'Popular fast-food chain offering chicken and fries',
    required: false
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

  @ApiProperty({
    description: 'Restaurant location details',
    type: LocationDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
