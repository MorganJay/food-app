import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsNumber, IsPositive, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';

export class SelectedCartChoiceDto {
  @ApiProperty({ example: 'Protein', description: 'The heading/group name for the customization' })
  @IsNotEmpty()
  @IsString()
  groupName: string;
  
  @ApiProperty({ example: 'Beef', description: 'Name of the selected customization' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 1500, description: 'Extra cost upcharge for this item selection' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class AddToCartDto {
  @ApiProperty({
    example: '66b1f7c3a12d4e5f67890123',
    description: 'ID of the product being added to cart',
  })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the product',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    type: [SelectedCartChoiceDto],
    description: 'Array of custom selected buyer modifications or side choices',
    example: [{ groupName: 'Protein', name: 'Beef', price: 1500 }]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedCartChoiceDto)
  selectedChoices?: SelectedCartChoiceDto[];
}

export class UpdateCartItemDto {
  @ApiProperty({
    example: 3,
    description: 'Updated quantity of the cart item',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;
}

// Subdocument DTO definition for Swagger and strict typing
export class CartItemImageDto {
  @ApiProperty({ example: 'https://cloudinary.com/image.png', description: 'Secure URL of the image asset' })
  url: string;

  @ApiPropertyOptional({ example: 'cloudinary_id_abc123', description: 'Cloudinary storage unique resource identifier' })
  publicId?: string;
}

class CartItemResponseDto {
  @ApiProperty({
    example: '66b1f7c3a12d4e5f67890123',
    description: 'Product ID',
  })
  productId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the product in cart',
  })
  quantity: number;

  @ApiProperty({
    example: 1500,
    description: 'Price per unit of the product',
  })
  price: number;

  @ApiProperty({
    example: 3500,
    description: 'Aggregated subtotal calculation for this line item (base price + customized choices) multiplied by quantity',
  })
  subtotal: number; // Added field

  @ApiPropertyOptional({
    type: CartItemImageDto,
    description: 'Image configurations of the product details',
  })
  image?: CartItemImageDto; // Added field

  @ApiProperty({
    example: 'Chicken Burger',
    description: 'Name of the product',
  })
  name: string;

  @ApiProperty({ type: [SelectedCartChoiceDto], description: 'List of item modifications' })
  selectedChoices: SelectedCartChoiceDto[];
}

export class CartResponseDto {
  @ApiProperty({
    example: '66b1f7c3a12d4e5f67890000',
    description: 'Cart ID',
  })
  id: string;

  @ApiProperty({
    example: 1,
    description: 'Auto-generated serial number',
  })
  serialNumber: number;

  @ApiProperty({
    example: '66b1f7c3a12d4e5f67890999',
    description: 'Restaurant ID',
    required: false,
  })
  restaurantId?: string;

  @ApiProperty({
    type: [CartItemResponseDto],
    description: 'List of items in the cart',
  })
  items: CartItemResponseDto[];

  @ApiProperty({
    example: 3000,
    description: 'Total cart amount',
  })
  total: number;

  @ApiProperty({
    example: '2026-05-15T12:00:00.000Z',
    description: 'Date the cart was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-05-15T12:30:00.000Z',
    description: 'Date the cart was last updated',
  })
  updatedAt: Date;
}