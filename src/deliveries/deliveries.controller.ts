import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { DeliveriesService } from './deliveries.service';
import { DeliveryStatus } from '../schemas/Delivery.schema';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.deliveriesService.findById(id);
  }

  @Get('order/:orderId')
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.deliveriesService.findByOrderId(orderId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/location')
  async updateLocation(
    @Param('id') id: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.deliveriesService.updateLocation(id, latitude, longitude);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: DeliveryStatus,
  ) {
    return this.deliveriesService.updateStatus(id, status);
  }
}
