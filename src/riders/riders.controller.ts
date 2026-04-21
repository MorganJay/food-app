import { Controller, Patch, Body, UseGuards, Req } from '@nestjs/common';
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
import { RidersService } from './riders.service';

@ApiTags('Riders')
@ApiBearerAuth()
@Controller('riders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RidersController {
  constructor(private ridersService: RidersService) {}

  @Patch('status')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Update rider online status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(@Body('isOnline') isOnline: boolean, @Req() req) {
    return this.ridersService.updateStatus(req.user.sub, isOnline);
  }

  @Patch('location')
  @Roles(UserRole.RIDER)
  async updateLocation(
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
    @Req() req,
  ) {
    return this.ridersService.updateLocation(req.user.sub, latitude, longitude);
  }
}
