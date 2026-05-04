import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { ConsumersService } from './consumers.service';
import { ToggleFavoriteDto } from './dto/consumers.dto';

@ApiTags('Consumers')
@ApiBearerAuth('jwt')
@Controller('consumers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsumersController {
  constructor(private consumersService: ConsumersService) { }

  @Get('profile')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Get consumer profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(@Req() req) {
    return this.consumersService.getProfile(req.user.sub);
  }

  @Patch('profile')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Update consumer profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(@Req() req, @Body() updateData: any) {
    return this.consumersService.updateProfile(req.user.sub, updateData);
  }

  @Post('toggleFavorites')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Toggle favorite vendor' })
  @ApiResponse({ status: 200, description: 'Favorite toggled' })
  async toggleFavorite(@Req() req, @Body() dto: ToggleFavoriteDto) {
    return this.consumersService.toggleFavorite(req.user.sub, dto.vendorId);
  }

  @Get('orders')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Get consumer orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async getOrders(@Req() req) {
    return this.consumersService.getOrders(req.user.sub);
  }
}
