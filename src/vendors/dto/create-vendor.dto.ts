import { IsNotEmpty, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({
    description: 'GeoJSON type (must always be Point)',
    example: 'Point',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Coordinates in [longitude, latitude]',
    example: [3.947, 7.3775],
  })
  @IsNotEmpty()
  coordinates: number[];
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
    description: 'Vendor location (GeoJSON Point)',
    example: {
      type: 'Point',
      coordinates: [3.947, 7.3775],
    },
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

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

  @ApiProperty({
    required: false,
    example: {
      type: 'Point',
      coordinates: [3.95, 7.38],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  openHours?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  closeHours?: string;
}