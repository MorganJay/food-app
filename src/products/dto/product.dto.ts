import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() description: string;
  @IsNotEmpty() @IsNumber() price: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() image?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
}
