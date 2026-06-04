import { ApiProperty } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order.dto';

export class CheckoutSummaryResponseDto {
  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  serviceFee: number;

  @ApiProperty()
  deliveryFee: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
}