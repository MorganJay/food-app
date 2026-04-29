import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({
    example: 'prod_12345',
    description: 'Product ID',
  })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the product',
  })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({
    example: 1500,
    description: 'Price per unit',
  })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiProperty({
    example: 'Chicken Burger',
    description: 'Product name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: 'cart_12345',
    description: 'Cart ID (if creating order from cart)',
  })
  @IsOptional()
  @IsString()
  cartId?: string;

  @ApiPropertyOptional({
    example: 'ORD-2026-0001',
    description: 'Unique order reference',
  })
  @IsOptional()
  @IsString()
  orderReference?: string;

  @ApiPropertyOptional({
    example: 'vendor_67890',
    description: 'Vendor ID',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({
    type: [OrderItemDto],
    description: 'List of items in the order',
  })
  @IsOptional()
  @IsArray()
  items?: OrderItemDto[];

  @ApiPropertyOptional({
    example: 3000,
    description: 'Total order amount',
  })
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiProperty({
    example: '123 Ring Road, Ibadan',
    description: 'Delivery address',
  })
  @IsNotEmpty()
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional({
    example: 'Please deliver quickly',
    description: 'Additional notes for the order',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}