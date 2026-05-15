import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: 'vendor_12345',
    description: 'ID of the vendor being reviewed',
  })
  @IsNotEmpty()
  @IsString()
  vendorId: string;

  @ApiPropertyOptional({
    example: 'food_67890',
    description: 'ID of the food item being reviewed (if applicable)',
  })
  @IsOptional()
  @IsString()
  foodId?: string;

  @ApiProperty({
    example: 4,
    description: 'Rating between 1 and 5',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Great taste and fast delivery!',
    description: 'Optional review comment',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Updated rating (1-5)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: 'Updated comment',
    description: 'Updated review comment',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

class ReviewReportResponseDto {
  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  createdAt: Date;
}

export class ReviewResponseDto {
  @ApiProperty({
    example: '66c1f1a2b11d4e5f67891234',
  })
  id: string;

  @ApiProperty({
    example: 1,
    description: 'Auto-increment serial number',
  })
  serialNumber: number;

  @ApiProperty({
    example: 'consumer_12345',
    description: 'ID of the consumer who created the review',
  })
  consumerId: string;

  @ApiProperty({
    example: 'vendor_12345',
    description: 'Vendor being reviewed',
  })
  vendorId: string;

  @ApiProperty({
    example: 'product_67890',
    required: false,
    description: 'Optional product being reviewed',
  })
  productId?: string;

  @ApiProperty({
    example: 4,
    description: 'Rating (1 to 5)',
  })
  rating: number;

  @ApiProperty({
    example: 'Great food and fast delivery',
    required: false,
  })
  comment?: string;

  @ApiProperty({
    type: [ReviewReportResponseDto],
    description: 'Reports submitted on this review',
  })
  reports: ReviewReportResponseDto[];

  @ApiProperty({
    example: '2026-05-15T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-05-15T12:30:00.000Z',
  })
  updatedAt: Date;
}