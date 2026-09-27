import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { PaymentMethod, PaymentGateway, PaymentStatus } from '../../schemas/Payment.schema';

export class InitializePaymentDto {
  @ApiProperty()
  @IsMongoId()
  orderId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    enum: PaymentGateway,
    default: PaymentGateway.PAYSTACK,
  })
  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  transactionRef: string;
}

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: 'Partial refund amount in Naira' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Note explaining reason for refund' })
  @IsOptional()
  @IsString()
  merchantNote?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: PaymentGateway })
  gateway: PaymentGateway;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}