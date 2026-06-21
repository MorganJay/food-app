import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../schemas/Order.schema';
import { CreateDeliveryAddressDto } from 'src/consumers/dto/delivery-address.dto';
import { Type } from 'class-transformer';

export class SelectedChoiceDto {
  @ApiProperty({ example: 'Protein', description: 'The heading/group name for the customization' })
  @IsNotEmpty()
  @IsString()
  groupName: string;
  
  @ApiProperty({ example: 'Beef', description: 'Name of the selected option' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 1500, description: 'Extra option cost modifier' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class OrderItemDto {
  @ApiProperty({ example: 'prod_12345', description: 'Product ID' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, description: 'Quantity of the product' })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 1500, description: 'Price per unit' })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'Chicken Burger', description: 'Product name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ type: [SelectedChoiceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedChoiceDto)
  selectedChoices?: SelectedChoiceDto[];
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  restaurantId: string;

  @ApiProperty({ type: [OrderItemDto], description: 'List of items in the order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateDeliveryAddressDto)
  deliveryAddress: CreateDeliveryAddressDto;

  @ApiPropertyOptional({ example: 'Please deliver quickly' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderItemResponseDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: [SelectedChoiceDto], description: 'List of item modifications' })
  selectedChoices: SelectedChoiceDto[];
}

export class OrderResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  serialNumber: number;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty()
  orderReference: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  serviceFee: number;

  @ApiProperty()
  deliveryFee: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: CreateDeliveryAddressDto })
  deliveryAddress: CreateDeliveryAddressDto;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ example: 'Please deliver at the gate' })
  notes?: string;

  @ApiPropertyOptional()
  riderId?: string;

  @ApiProperty()
  paymentStatus: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}