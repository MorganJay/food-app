import { ApiProperty } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order.dto';

class CheckoutAddressDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  addressLine: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  postalCode: string;

  @ApiProperty()
  country: string;

  @ApiProperty({ required: false })
  instructions?: string;
}

export class CheckoutSummaryResponseDto {
  @ApiProperty({
    type: CheckoutAddressDto,
    nullable: true,
  })
  deliveryAddress: CheckoutAddressDto | null;

  @ApiProperty()
  cartTotal: number;

  @ApiProperty()
  serviceFee: number;

  @ApiProperty()
  deliveryFee: number;

  @ApiProperty()
  grandTotal: number;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
}