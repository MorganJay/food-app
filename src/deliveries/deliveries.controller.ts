import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {  ApiBearerAuth, ApiOperation, ApiTags, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { DeliveriesService } from './deliveries.service';
import { DeliveryStatus } from '../schemas/Delivery.schema';

@ApiTags('Deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery by ID' })
  @ApiParam({
    name: 'id',
    example: 'delivery_12345',
    description: 'Delivery ID',
  })
  @ApiResponse({ status: 200, description: 'Delivery retrieved successfully' })
  async findById(@Param('id') id: string) {
    return this.deliveriesService.findById(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get delivery by order ID' })
  @ApiParam({
    name: 'orderId',
    example: 'order_67890',
    description: 'Order ID',
  })
  @ApiResponse({ status: 200, description: 'Delivery retrieved successfully' })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.deliveriesService.findByOrderId(orderId);
  }

  @Patch(':id/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update delivery location' })
  @ApiParam({
    name: 'id',
    example: 'delivery_12345',
    description: 'Delivery ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        latitude: { type: 'number', example: 7.3775 },
        longitude: { type: 'number', example: 3.9470 },
      },
      required: ['latitude', 'longitude'],
    },
  })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async updateLocation(
    @Param('id') id: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.deliveriesService.updateLocation(id, latitude, longitude);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update delivery status' })
  @ApiParam({
    name: 'id',
    example: 'delivery_12345',
    description: 'Delivery ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(DeliveryStatus),
          example: 'IN_TRANSIT',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: DeliveryStatus,
  ) {
    return this.deliveriesService.updateStatus(id, status);
  }
}
