import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsArray, IsOptional } from 'class-validator';

export class ConsumerResponseDto {
  @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
  id: string;

  @ApiProperty({ example: 'user123' })
  userId: string;

  @ApiProperty({
    example: ['vendorId1', 'vendorId2'],
  })
  favorites: string[];

  @ApiProperty({
    example: [],
    description: 'List of order IDs or order objects depending on schema',
  })
  orderHistory: any[];

  @ApiPropertyOptional({
    description: 'Saved delivery addresses for the consumer',
  })
  addresses?: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ example: 1 })
  serialNumber: number;
}

export class ToggleFavoriteDto {
  @ApiProperty({
    example: '64f1c2a9b1234567890abcd1',
    description: 'ID of the vendor to toggle as favorite',
  })
  @IsMongoId()
  vendorId: string;
}

export class UpdateConsumerDto {
  @ApiPropertyOptional({
    example: ['64f1c2a9b1234567890abcd1'],
    description: 'Updated list of favorite vendor IDs',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  favorites?: string[];
}
