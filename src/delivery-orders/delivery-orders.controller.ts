import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { DeliveryOrdersService } from './delivery-orders.service';
import { DbglService } from '../dbgl/dbgl.service';

@ApiTags('Delivery Orders')
@Controller('delivery-orders')
export class DeliveryOrdersController {
  constructor(
    private readonly deliveryOrdersService: DeliveryOrdersService,
    private readonly dbglService: DbglService,
  ) {}

  @Post('price-quote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Get a delivery fee quote before placing the order',
  })
  async quote(@Body() payload: any) {
    return this.dbglService.quote(payload);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Receive delivery partner webhook events' })
  async webhook(@Body() payload: any, @Req() req: any) {
    const signature =
      req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'];
    await this.dbglService.handleWebhook(payload || {}, signature, req.rawBody);
    return { ok: true };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Create a delivery order directly via the delivery partner API',
  })
  @ApiResponse({ status: 201, description: 'DBGL order created' })
  async create(@Body() payload: Record<string, any>) {
    return this.dbglService.createOrder(payload);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'List delivery orders stored in our database' })
  async findAll(
    @Query('type') type: 'order' | 'webhook_event' | 'status_update' = 'order',
    @Query('provider') provider?: string,
    @Query('event') event?: string,
    @Query('status') status?: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.deliveryOrdersService.findAll(
      { recordType: type, provider, event, status },
      Number.parseInt(skip, 10),
      Number.parseInt(limit, 10),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get one delivery order from our database by id' })
  async findById(@Param('id') id: string) {
    return this.deliveryOrdersService.findById(id);
  }

  @Get('provider-status/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Poll the delivery provider status in local development only',
  })
  async pollProviderStatus(@Param('orderId') orderId: string) {
    return this.dbglService.pollStatusByOrderId(orderId);
  }
}
