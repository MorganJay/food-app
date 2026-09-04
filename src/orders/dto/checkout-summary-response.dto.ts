import { ApiProperty } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order.dto';

export class CheckoutSummaryResponseDto {
  @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
  restaurantId: string;

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