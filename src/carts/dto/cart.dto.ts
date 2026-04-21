import { IsNotEmpty, IsString, IsNumber, IsPositive } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty() @IsString() productId: string;
  @IsNotEmpty() @IsString() vendorId: string;
  @IsNotEmpty() @IsNumber() @IsPositive() quantity: number;
  @IsNotEmpty() @IsNumber() @IsPositive() price: number;
  @IsNotEmpty() @IsString() name: string;
}

export class UpdateCartItemDto {
  @IsNotEmpty() @IsNumber() @IsPositive() quantity: number;
}
