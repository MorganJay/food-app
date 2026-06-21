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
import { Transform, Type } from 'class-transformer';

export class SelectionOptionDto {
  @ApiProperty({ 
    example: 'Beef', 
    description: 'Name of the option field input (e.g., Chicken, Extra Plantain)' 
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 1500, 
    description: 'The extra price field input added to the base meal cost' 
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class ChoiceGroupDto {
  @ApiProperty({ 
    example: 'Choose your protein', 
    description: 'The customization header field input (e.g., Choose your protein, Add extras)' 
  })
  @IsNotEmpty()
  @IsString()
  groupName: string;

  @ApiProperty({ 
    example: true, 
    description: 'Toggle switch or boolean value field' 
  })
  @IsNotEmpty()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ 
    type: () => [SelectionOptionDto], 
    description: 'Array of the customizable sub-option list',
    example: [
      { name: 'Beef', price: 1500 },
      { name: 'Chicken', price: 1000 }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectionOptionDto)
  options: SelectionOptionDto[];
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
  @IsString()
  description?: string;

  @ApiProperty({
    example: 3500,
    description: 'Price of the food product in local currency',
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
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Product image file',
  })
  image?: any;

  // --- CHANGED HERE: Stripped validation decorators to let the Service process the raw FormData text safely ---
  @ApiPropertyOptional({
    type: () => [ChoiceGroupDto],
    description: 'Structured array list or JSON string for configuring custom buyer choices and extra options.',
    example: [
      {
        groupName: 'Choose your protein',
        isRequired: true,
        options: [
          { name: 'Beef', price: 1500 },
          { name: 'Chicken', price: 1000 }
        ]
      },
      {
        groupName: 'Add Extras',
        isRequired: false,
        options: [
          { name: 'Extra Plantain', price: 500 },
          { name: 'Egg', price: 400 }
        ]
      }
    ]
  })
  @IsOptional()
  choiceGroups?: any; 
}

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'Double Cheese Burger',
    description: 'Updated name of the food product',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'A larger burger with double beef patties and extra cheese',
    description: 'Updated description of the food product',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 4500,
    description: 'Updated price of the food product',
  })
  @Type(() => Number)
  @IsOptional()
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

  @ApiPropertyOptional({
    example: 'Grilled Specials',
    description: 'Updated category of the food product',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Product image file',
  })
  image?: any;

  @ApiPropertyOptional({
    example: true,
    description: 'Availability status of the food product',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isAvailable?: boolean;

  // --- CHANGED HERE TOO: Keeps Swagger documentation structure intact while using service mapping ---
  @ApiPropertyOptional({
    type: () => [ChoiceGroupDto],
    description: 'Structured array list or JSON string for configuring custom buyer choices and extra options.',
    example: [
      {
        groupName: 'Choose your protein',
        isRequired: true,
        options: [
          { name: 'Beef', price: 1500 },
          { name: 'Chicken', price: 1000 }
        ]
      }
    ]
  })
  @IsOptional()
  choiceGroups?: any;
}

export class ProductResponseDto {
  @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
  id: string;

  @ApiProperty({ example: 'Cheese Burger' })
  name: string;

  @ApiProperty({
    example: 'A juicy beef burger topped with cheddar cheese and fresh lettuce',
  })
  description: string;

  @ApiProperty({ example: 3500 })
  price: number;

  @ApiProperty({ example: 'plate' })
  unit: string;

  @ApiPropertyOptional({ example: 15 })
  prepTime?: number;

  @ApiPropertyOptional({ example: 'Fast Food' })
  category?: string;

  @ApiPropertyOptional({
    example: 'https://your-cdn.com/uploads/burger.jpg',
  })
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

  @ApiProperty({ type: [ChoiceGroupDto], description: 'Configured option choices for tailoring the order' })
  choiceGroups: ChoiceGroupDto[];
}