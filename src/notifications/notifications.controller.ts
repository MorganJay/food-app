import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { NotificationsService, SmsNotification } from './notifications.service';
import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

class SendSmsDto {
  @IsString()
  to: string;

  @IsString()
  message: string;
}

class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;
}

class SendPushDto {
  @IsString()
  token: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

@ApiTags('Notifications')
@ApiBearerAuth('jwt')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Post('send-sms')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send SMS notification' })
  @ApiResponse({ status: 201, description: 'SMS sent' })
  async sendSms(@Body() dto: SendSmsDto) {
    return this.notificationsService.sendSms({
      to: dto.to,
      message: dto.message,
    });
  }

  @Post('send-email')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send email notification' })
  @ApiResponse({ status: 201, description: 'Email sent' })
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationsService.sendEmail({
      to: dto.to,
      subject: dto.subject,
      body: dto.body,
    });
  }

  @Post('send-push')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send push notification' })
  @ApiResponse({ status: 201, description: 'Push notification sent' })
  async sendPush(@Body() dto: SendPushDto) {
    return this.notificationsService.sendPush({
      token: dto.token,
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });
  }

  @Post('bulk-sms')
  @Roles(UserRole.ADMIN)
  async sendBulkSms(@Body() notifications: SmsNotification[]) {
    return this.notificationsService.sendBulkSms(notifications);
  }
}
