import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
} from 'class-validator';

export class OrderItemDto {
  @IsNotEmpty() @IsString() productId: string;
  @IsNotEmpty() @IsNumber() quantity: number;
  @IsNotEmpty() @IsNumber() price: number;
  @IsNotEmpty() @IsString() name: string;
}

export class CreateOrderDto {
  @IsOptional() @IsString() cartId?: string;
  @IsOptional() @IsString() orderReference?: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsArray() items?: OrderItemDto[];
  @IsOptional() @IsNumber() total?: number;
  @IsNotEmpty() @IsString() deliveryAddress: string;
  @IsOptional() @IsString() notes?: string;
}
