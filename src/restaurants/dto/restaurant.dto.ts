import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateRestaurantDto {
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() description: string;
  @IsNotEmpty() @IsString() address: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class UpdateRestaurantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
}
