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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { PaymentMethod, PaymentGateway } from '../schemas/Payment.schema';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initialize')
  @Roles(UserRole.CONSUMER)
  async initialize(
    @Body()
    body: {
      orderId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      currency?: string;
    },
    @Req() req,
  ) {
    return this.paymentsService.initialize(
      body.orderId,
      req.user.sub,
      body.amount,
      body.paymentMethod,
      body.currency,
      PaymentGateway.PAYSTACK,
    );
  }

  @Post(':id/verify')
  @Roles(UserRole.CONSUMER)
  async verify(
    @Param('id') id: string,
    @Body() body: { transactionRef: string },
  ) {
    return this.paymentsService.verify(id, body.transactionRef);
  }

  @Get('history')
  @Roles(UserRole.CONSUMER)
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
  async getWalletBalance(@Req() req) {
    return this.paymentsService.getWalletBalance(req.user.sub);
  }

  @Post(':id/refund-request')
  @Roles(UserRole.CONSUMER)
  async requestRefund(@Param('id') id: string) {
    return this.paymentsService.requestRefund(id);
  }

  @Patch(':id/refund')
  @Roles(UserRole.ADMIN)
  async refund(@Param('id') id: string) {
    return this.paymentsService.refund(id);
  }
}
