import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsPositive } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    example: 'prod_12345',
    description: 'ID of the product being added to cart',
  })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({
    example: 'vendor_67890',
    description: 'ID of the vendor selling the product',
  })
  @IsNotEmpty()
  @IsString()
  vendorId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the product',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    example: 1500,
    description: 'Price per unit of the product',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    example: 'Chicken Burger',
    description: 'Name of the product',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
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