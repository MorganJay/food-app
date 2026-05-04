import { IsNotEmpty, IsString, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({
    description: 'Physical address of the restaurant',
    example: 'ikeja, Lagos State',
    required: false
  })
  @IsString()
  address?: string;

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

export class CreateVendorDto {
  @ApiProperty({
    description: 'Business name of the vendor',
    example: 'Mama Put Kitchen',
  })
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @ApiProperty({
    description: 'Description of the vendor business',
    example: 'Local food vendor serving delicious Nigerian dishes',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Vendor location details',
    type: LocationDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({
    description: 'Opening time',
    example: '08:00',
  })
  @IsNotEmpty()
  @IsString()
  openHours: string;

  @ApiProperty({
    description: 'Closing time',
    example: '22:00',
  })
  @IsNotEmpty()
  @IsString()
  closeHours: string;
}

export class UpdateVendorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  businessName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: LocationDto })
  location?: LocationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  openHours?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  closeHours?: string;
}

export class VendorResponseDto {
  @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
  id: string;

  @ApiProperty({ example: 'Mama Put Kitchen' })
  businessName: string;

  @ApiProperty({ example: 'Local food vendor serving delicious Nigerian dishes' })
  description: string;

  @ApiProperty({ example: '08:00' })
  openHours: string;

  @ApiProperty({ example: '22:00' })
  closeHours: string;

  @ApiProperty({ example: false })
  isVerified: boolean;

  @ApiProperty({ type: LocationDto })
  location: LocationDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}