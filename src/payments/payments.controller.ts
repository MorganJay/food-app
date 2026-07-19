import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { PaymentGateway } from '../schemas/Payment.schema';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto, PaymentResponseDto, VerifyPaymentDto } from './dto/payments.dto';

@ApiTags('Payments')
@ApiBearerAuth('jwt')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initialize')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({
    summary: 'Initialize payment for an order',
  })
  @ApiBody({ type: InitializePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment initialized successfully',
    type: PaymentResponseDto,
  })
  async initialize(
    @Body() dto: InitializePaymentDto, // Fixed: Swapped custom type object out for the real validated DTO
    @Req() req,
  ) {
    return this.paymentsService.initialize(
      dto.orderId,
      req.user.sub,
      dto.paymentMethod,
      dto.gateway || PaymentGateway.PAYSTACK,
    );
  }

  @Post(':id/verify')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Verify payment transaction' })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async verify(
    @Param('id') id: string,
    @Body() body: VerifyPaymentDto,
    @Req() req,
  ) {
    return this.paymentsService.verify(id, body.transactionRef, req.user.sub);
  }

  @Get('history')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async getHistory(
    @Req() req,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.paymentsService.getHistory(
      req.user.sub,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @Get('wallet/balance')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Get wallet balance (coming soon)' })
  async getWalletBalance(@Req() req) {
    return this.paymentsService.getWalletBalance(req.user.sub);
  }

  @Post(':id/refund-request')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Request refund for a payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async requestRefund(@Param('id') id: string, @Req() req) {
    return this.paymentsService.requestRefund(id, req.user.sub);
  }

  @Patch(':id/refund')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve refund (admin only)' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async refund(@Param('id') id: string) {
    return this.paymentsService.refund(id);
  }
}