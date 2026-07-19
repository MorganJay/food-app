import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto, OrderResponseDto } from './dto/order.dto';
import { OrderStatus } from '../schemas/Order.schema';
import { CheckoutSummaryResponseDto } from './dto/checkout-summary-response.dto';

@ApiTags('Orders')
@ApiBearerAuth('jwt')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private ordersGateway: OrdersGateway,
  ) {}

  @Roles(UserRole.CONSUMER)
  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  @ApiResponse({ status: 201, description: 'Order created', type: OrderResponseDto })
  async create(@Body() createDto: CreateOrderDto, @Req() req) {
    return this.ordersService.create(req.user.sub, createDto);
  }

  @Roles(UserRole.CONSUMER)
  @Get('checkout-summary')
  @ApiOperation({ summary: 'Get checkout summary' })
  @ApiResponse({
    status: 200,
    description: 'Checkout summary retrieved successfully',
    type: CheckoutSummaryResponseDto,
  })
  async getCheckoutSummary(@Req() req) {
    return this.ordersService.getCheckoutSummary(
      req.user.sub,
    );
  }

  @Get()
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of records to return',
    example: 20,
  })
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'Orders list' })
  async findByUser(
    @Req() req,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.ordersService.findByUser(
      req.user.sub,
      parseInt(skip, 10),
      parseInt(limit, 10),
    );
  }

  @Roles(UserRole.VENDOR)
  @Get('restaurant')
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of records to return',
    example: 20,
  })
  async findByRestaurant(
    @Req() req,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.ordersService.findByRestaurantUser(
      req.user.sub,
      parseInt(skip, 10),
      parseInt(limit, 10),
    );
  }

  @Roles(UserRole.VENDOR)
  @Get('restaurant/analytics')
  async restaurantAnalytics(@Req() req) {
    return this.ordersService.restaurantAnalyticsByUser(req.user.sub);
  }

  @Roles(UserRole.ADMIN)
  @Get('all')
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of records to return',
    example: 20,
  })
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.ordersService.findAll(parseInt(skip, 10), parseInt(limit, 10));
  }

  @Roles(UserRole.ADMIN)
  @Get('analytics')
  async analytics() {
    return this.ordersService.analytics();
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req) {
    return this.ordersService.findById(id, {
      sub: req.user.sub,
      role: req.user.role,
    });
  }

  @Roles(UserRole.CONSUMER, UserRole.VENDOR, UserRole.ADMIN, UserRole.RIDER)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Req() req,
  ) {
    const updated = await this.ordersService.updateStatus(id, status, {
      sub: req.user.sub,
      role: req.user.role,
    });
    this.ordersGateway.emitOrderStatus(updated);
    return updated;
  }

  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @Patch(':id/rider')
  async assignRider(
    @Param('id') id: string,
    @Body('riderId') riderId: string,
    @Req() req,
  ) {
    const updated = await this.ordersService.assignRider(id, riderId, {
      sub: req.user.sub,
      role: req.user.role,
    });
    this.ordersGateway.emitRiderAssignment(updated);
    return updated;
  }
}