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
  @ApiProperty({ example: '669a3aef8d2f5a11b8c9e002' })
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

export class OrderItemImageDto {
  @ApiProperty({ example: 'https://cloudinary.com/image.png' })
  url: string;

  @ApiPropertyOptional({ example: 'cloudinary_id_abc123' })
  publicId?: string;
}

export class OrderItemResponseDto {
  @ApiProperty({ example: '669a3b308d2f5a11b8c9e008' })
  productId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 2200 })
  price: number;

  @ApiProperty({ example: 'pap' })
  name: string;

  @ApiProperty({ example: 1500, description: 'Line item total value' })
  subtotal: number;

  @ApiPropertyOptional({ type: OrderItemImageDto })
  image?: OrderItemImageDto;

  @ApiProperty({ type: [SelectedChoiceDto], description: 'List of item modifications' })
  selectedChoices: SelectedChoiceDto[];
}

export class OrderUserDto {
  @ApiProperty({ example: 'John', description: 'The customer first name' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'The customer last name' })
  lastName: string;

  @ApiProperty({ example: '+2348012345678', description: 'The customer contact phone number' })
  phoneNumber: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: '669a3b608d2f5a11b8c9e010' })
  _id: string;

  @ApiProperty({ example: 10024 })
  serialNumber: number;

  @ApiProperty({ example: '669a3aef8d2f5a11b8c9e002' })
  restaurantId: string;

  @ApiProperty({ type: OrderUserDto, description: 'Snapshot details of the ordering customer' })
  user: OrderUserDto;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ example: 'ORD-1721382412-10024' })
  orderReference: string;

  @ApiProperty({ example: 4400 })
  subtotal: number;

  @ApiProperty({ example: 440 })
  serviceFee: number;

  @ApiProperty({ example: 4000 })
  deliveryFee: number;

  @ApiProperty({ example: 8840 })
  total: number;

  @ApiProperty({ type: CreateDeliveryAddressDto })
  deliveryAddress: CreateDeliveryAddressDto;

  @ApiProperty({ 
    enum: OrderStatus,
    example: 'pending [Options: pending, accepted, preparing, ready_for_pickup, out_for_delivery, delivered, cancelled_by_consumer, cancelled_by_vendor]', 
    description: 'Current status of the order.'
  })
  status: OrderStatus;

  @ApiProperty({ example: 'Please deliver at the gate' })
  notes?: string;

  @ApiPropertyOptional({ example: '669a3b508d2f5a11b8c9e009' })
  riderId?: string;

  @ApiProperty({ example: 'pending' })
  paymentStatus: string;

  @ApiProperty({ example: '2026-07-19T09:40:12.123Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-19T10:39:15.456Z' })
  updatedAt: Date;
}