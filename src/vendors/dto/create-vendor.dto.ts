import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

class LocationDto {
  @ApiPropertyOptional({
    description: 'Physical address of the restaurant',
    example: 'Ikeja, Lagos State',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 7.3775,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 3.947,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class CreateVendorDto {
  @ApiProperty({
    description: 'Name of the vendor business',
    example: 'Mama Put Kitchen',
  })
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @ApiProperty({
    description: 'Short description of the vendor and what they offer',
    example: 'Local food vendor serving delicious Nigerian dishes and soups',
  })
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Vendor location details including address and coordinates',
    type: LocationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({
    description: 'Vendor image URL stored in Cloudinary',
    example: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
  })
  @IsOptional()
  @IsString()
  image?: string;
}

export class UpdateVendorDto extends PartialType(CreateVendorDto) { }

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
    example: 'https://res.cloudinary.com/.../image.jpg',
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
    type: LocationDto,
  })
  location: LocationDto;

  @ApiPropertyOptional({
    example: '12345678901',
    description: 'User NIN number',
  })
  ninNumber?: string;

  @ApiPropertyOptional({
    example: false,
  })
  isNinVerified?: boolean;

  @ApiPropertyOptional()
  ninPhoto?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    example: 1,
  })
  serialNumber: number;
}