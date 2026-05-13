import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    description: 'Physical address of the restaurant',
    example: 'Ikeja, Lagos State',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate of the restaurant',
    example: 7.3775,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate of the restaurant',
    example: 3.947,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

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

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Vendor image file',
  })
  image?: any;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({
    example: 'Mama Put Kitchen',
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    example: 'Best local food vendor in Lagos',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the restaurant',
    example: 'Ikeja, Lagos State',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate of the restaurant',
    example: 7.3775,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate of the restaurant',
    example: 3.947,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  openHours?: string;

  @ApiPropertyOptional({
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  closeHours?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Vendor image file',
  })
  image?: any;
}

export class VendorResponseLocationDto {
  @ApiProperty({
    example: 'Ikeja, Lagos State',
  })
  address: string;

  @ApiProperty({
    example: 7.3775,
  })
  latitude: number;

  @ApiProperty({
    example: 3.947,
  })
  longitude: number;
}

export class VendorResponseDto {
  @ApiProperty({
    example: '67ab12cd34ef56gh78ij90kl',
  })
  id: string;

  @ApiProperty({
    example: 'Mama Put Kitchen',
  })
  businessName: string;

  @ApiProperty({
    example: 'Local food vendor serving delicious Nigerian dishes',
  })
  description: string;

  @ApiPropertyOptional({
    example: 'https://your-cdn.com/uploads/vendor.jpg',
  })
  image?: string;

  @ApiProperty({
    example: '08:00',
  })
  openHours: string;

  @ApiProperty({
    example: '22:00',
  })
  closeHours: string;

  @ApiProperty({
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    type: VendorResponseLocationDto,
  })
  location: VendorResponseLocationDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    example: 1,
  })
  serialNumber: number;
}