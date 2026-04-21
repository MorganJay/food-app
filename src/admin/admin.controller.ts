import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  async getAllUsers(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllUsers(parseInt(skip), parseInt(limit));
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.updateUserStatus(id, body.isActive);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('vendors/pending')
  async getPendingVendors(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getPendingVendors(parseInt(skip), parseInt(limit));
  }

  @Patch('vendors/:id/verify')
  async verifyVendor(@Param('id') id: string) {
    return this.adminService.verifyVendor(id);
  }

  @Get('analytics/riders')
  async getOnlineRiders() {
    return this.adminService.getOnlineRiders();
  }

  @Get('payments')
  async getAllPayments(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllPayments(parseInt(skip), parseInt(limit));
  }

  @Patch('payments/:id/refund')
  async refundPayment(@Param('id') id: string) {
    return this.adminService.refundPayment(id);
  }

  @Get('orders')
  async getAllOrders(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllOrders(parseInt(skip), parseInt(limit));
  }

  @Get('orders/analytics')
  async getOrderAnalytics() {
    return this.adminService.getOrderAnalytics();
  }
}
