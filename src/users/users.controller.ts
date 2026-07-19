import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { UpdateAvatarDto, UpdateUserProfileDto } from './dto/users.dto';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/schemas/User.schema';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  me(@Req() req) {
    return this.usersService.getMe(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  updateProfile(
    @Req() req,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Patch('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiBody({
    description: 'Update profile image using pre-uploaded URL data objects',
    type: UpdateAvatarDto,
  })
  @ApiOperation({ summary: 'Update user avatar reference links (pure JSON)' })
  async uploadAvatar(
    @Req() req,
    @Body() dto: UpdateAvatarDto,
  ) {
    return this.usersService.uploadAvatar(req.user.sub, dto);
  }
}