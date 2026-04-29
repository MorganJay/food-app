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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/order.dto';
import { OrderStatus } from '../schemas/Order.schema';

@ApiTags('Orders')
@ApiBearerAuth('jwt')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private ordersGateway: OrdersGateway,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(@Body() createDto: CreateOrderDto, @Req() req) {
    return this.ordersService.create(req.user.sub, createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'Orders list' })
  async findByUser(
    @Req() req,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.ordersService.findByUser(
      req.user.sub,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER, UserRole.VENDOR, UserRole.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    const updated = await this.ordersService.updateStatus(id, status);
    this.ordersGateway.emitOrderStatus(updated);
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @Patch(':id/rider')
  async assignRider(@Param('id') id: string, @Body('riderId') riderId: string) {
    const updated = await this.ordersService.assignRider(id, riderId);
    this.ordersGateway.emitRiderAssignment(updated);
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor')
  async findByVendor(
    @Req() req,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.ordersService.findByVendorUser(
      req.user.sub,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor/analytics')
  async vendorAnalytics(@Req() req) {
    return this.ordersService.vendorAnalyticsByUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('all')
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.ordersService.findAll(parseInt(skip), parseInt(limit));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('analytics')
  async analytics() {
    return this.ordersService.analytics();
  }
}
