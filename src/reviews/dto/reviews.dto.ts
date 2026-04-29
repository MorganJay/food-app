import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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