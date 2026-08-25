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
  HttpCode,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { PaymentGateway } from '../schemas/Payment.schema';
import { PaymentsService } from './payments.service';
import {
  InitializePaymentDto,
  PaymentResponseDto,
  RefundPaymentDto,
} from './dto/payments.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Initialize payment for an order' })
  @ApiBody({ type: InitializePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment initialized successfully',
    type: PaymentResponseDto,
  })
  async initialize(@Body() dto: InitializePaymentDto, @Req() req) {
    return this.paymentsService.initialize(
      dto.orderId,
      req.user.sub,
      dto.paymentMethod,
      dto.gateway || PaymentGateway.PAYSTACK,
    );
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Verify payment transaction' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async verify(@Param('reference') reference: string) {
    return this.paymentsService.verify(reference);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth('jwt')
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
      parseInt(skip, 10),
      parseInt(limit, 10),
    );
  }

  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get wallet balance (coming soon)' })
  async getWalletBalance(@Req() req) {
    return this.paymentsService.getWalletBalance(req.user.sub);
  }

  @Post(':id/refund-request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Request refund for a payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async requestRefund(@Param('id') id: string, @Req() req) {
    return this.paymentsService.requestRefund(id, req.user.sub);
  }

  @Patch(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Approve refund (admin only)' })
  @ApiBody({ type: RefundPaymentDto, required: false })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async refund(
    @Param('id') id: string,
    @Body() dto?: RefundPaymentDto,
  ) {
    return this.paymentsService.refund(id, dto?.amount, dto?.merchantNote);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook receiver' })
  async handlePaystackWebhook(
    @Req() req: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.body, signature, req.rawBody);
  }
}