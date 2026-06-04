import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsNumber, IsPositive } from 'class-validator';

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
    example: 'Chicken Burger',
    description: 'Name of the product',
  })
  name: string;
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