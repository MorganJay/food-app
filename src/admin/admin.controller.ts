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
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth('jwt')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users (admin)' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getAllUsers(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllUsers(parseInt(skip), parseInt(limit));
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user active status' })
  @ApiParam({
    name: 'id',
    example: 'user_12345',
    description: 'User ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isActive: {
          type: 'boolean',
          example: true,
        },
      },
      required: ['isActive'],
    },
  })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.updateUserStatus(id, body.isActive);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({
    name: 'id',
    example: 'user_12345',
  })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('vendors/pending')
  @ApiOperation({ summary: 'Get pending vendor approvals' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getPendingVendors(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getPendingVendors(parseInt(skip), parseInt(limit));
  }

  @Patch('vendors/:id/verify')
  @ApiOperation({ summary: 'Verify a vendor' })
  @ApiParam({
    name: 'id',
    example: 'vendor_67890',
  })
  async verifyVendor(@Param('id') id: string) {
    return this.adminService.verifyVendor(id);
  }

  @Get('analytics/riders')
  @ApiOperation({ summary: 'Get online riders analytics' })
  @ApiResponse({ status: 200, description: 'Online riders data' })
  async getOnlineRiders() {
    return this.adminService.getOnlineRiders();
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getAllPayments(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllPayments(parseInt(skip), parseInt(limit));
  }

  @Patch('payments/:id/refund')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({
    name: 'id',
    example: 'payment_12345',
  })
  async refundPayment(@Param('id') id: string) {
    return this.adminService.refundPayment(id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getAllOrders(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getAllOrders(parseInt(skip), parseInt(limit));
  }

  @Get('orders/analytics')
  @ApiOperation({ summary: 'Get order analytics' })
  async getOrderAnalytics() {
    return this.adminService.getOrderAnalytics();
  }
}
