import { ApiProperty } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order.dto';

export class CheckoutSummaryResponseDto {
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