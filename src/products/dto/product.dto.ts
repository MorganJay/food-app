import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SelectionOptionDto {
  @ApiProperty({ 
    example: 'Beef', 
    description: 'Name of the option field input' 
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 1500, 
    description: 'The extra price added to the base meal cost' 
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class ChoiceGroupDto {
  @ApiProperty({ 
    example: 'Choose your protein', 
    description: 'The customization header field input' 
  })
  @IsNotEmpty()
  @IsString()
  groupName: string;

  @ApiProperty({ 
    example: true, 
    description: 'Toggle switch indicating if selection is mandatory' 
  })
  @IsNotEmpty()
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ 
    type: () => [SelectionOptionDto], 
    description: 'Array of the customizable sub-option list',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectionOptionDto)
  options: SelectionOptionDto[];
}

export class ProductImageDto {
  @ApiProperty({
    description: 'Secure Cloudinary URL of the product photo',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234/products/burger.jpg',
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Cloudinary public identifier tracking ID',
    example: 'products/burger_xyz123',
  })
  @IsString()
  @IsNotEmpty()
  publicId: string;
}

export class CreateProductDto {
  @ApiProperty({
    example: '67ab12cd34ef56gh78ij90kl',
    description: 'Restaurant unique ID',
  })
  @IsNotEmpty()
  @IsString()
  restaurantId: string;

  @ApiProperty({
    example: 'Cheese Burger',
    description: 'Name of the food product',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'A juicy beef burger topped with cheddar cheese and fresh lettuce',
    description: 'Detailed description of the food product',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 3500,
    description: 'Price of the food product',
  })
  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Price must be greater than 0' })
  price: number;

  @ApiProperty({ example: 'plate' })
  @IsNotEmpty({ message: 'Unit is required' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ example: 15, description: 'Prep time in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Prep time cannot be negative' })
  prepTime?: number;

  @ApiPropertyOptional({
    example: 'Fast Food',
    description: 'Category of the food product',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Availability status of the food product',
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Pre-uploaded product image details matching utility service layout',
    type: ProductImageDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductImageDto)
  image?: ProductImageDto;

  @ApiPropertyOptional({
    type: () => [ChoiceGroupDto],
    description: 'Structured array list for configuring custom options.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceGroupDto)
  choiceGroups?: ChoiceGroupDto[]; 
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Double Cheese Burger' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'A larger burger with double beef patties' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 4500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'plate' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Prep time cannot be negative' })
  prepTime?: number;

  @ApiPropertyOptional({ example: 'Grilled Specials' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    type: ProductImageDto,
    description: 'Updated product image pre-uploaded objects',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductImageDto)
  image?: ProductImageDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ type: () => [ChoiceGroupDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceGroupDto)
  choiceGroups?: ChoiceGroupDto[];
}

export class ProductResponseDto {
  @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
  id: string;

  @ApiProperty({ example: 'Cheese Burger' })
  name: string;

  @ApiProperty({ example: 'A juicy beef burger' })
  description: string;

  @ApiProperty({ example: 3500 })
  price: number;

  @ApiProperty({ example: 'plate' })
  unit: string;

  @ApiPropertyOptional({ example: 15 })
  prepTime?: number;

  @ApiPropertyOptional({ example: 'Fast Food' })
  category?: string;

  @ApiPropertyOptional({ example: 'https://your-cdn.com/uploads/burger.jpg' })
  image?: string;

  @ApiPropertyOptional({ example: true })
  isAvailable?: boolean;

  @ApiProperty({ example: '67vendorId123' })
  restaurantId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ example: 1 })
  serialNumber: number;

  @ApiProperty({ type: [ChoiceGroupDto] })
  choiceGroups: ChoiceGroupDto[];
}