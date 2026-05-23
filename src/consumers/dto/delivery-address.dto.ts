import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: '123 Ring Road, Ibadan' })
  @IsNotEmpty()
  addressLine: string;

  @ApiPropertyOptional({ example: 'Ibadan' })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Oyo' })
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '200001' })
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'NG' })
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'Geo location',
    example: { lat: 7.3775, lng: 3.947 },
  })
  @IsOptional()
  location?: { lat?: number; lng?: number };

  @ApiPropertyOptional({ example: 'Leave at gate' })
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateDeliveryAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  addressLine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  location?: { lat?: number; lng?: number };

  @ApiPropertyOptional()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class DeliveryAddressResponseDto {
  @ApiProperty({ example: '64f1c2a9b1234567890abcd1' })
  _id: string;

  @ApiProperty({ example: 'consumer123' })
  consumerId: string;

  @ApiProperty({ example: 'Home' })
  label: string;

  @ApiProperty({ example: '123 Ring Road, Ibadan' })
  addressLine: string;

  @ApiPropertyOptional({ example: 'Ibadan' })
  city?: string;

  @ApiPropertyOptional({ example: 'Oyo' })
  state?: string;

  @ApiPropertyOptional({ example: '200001' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'NG' })
  country?: string;

  @ApiPropertyOptional({ example: { lat: 7.3775, lng: 3.947 } })
  location?: { lat?: number; lng?: number };

  @ApiPropertyOptional({ example: 'Leave at the gate' })
  instructions?: string;

  @ApiPropertyOptional({ example: true })
  isDefault?: boolean;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;
}
