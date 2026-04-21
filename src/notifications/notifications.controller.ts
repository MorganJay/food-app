import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  NotificationsService,
  SmsNotification,
  EmailNotification,
  PushNotification,
} from './notifications.service';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/User.schema';

class SendSmsDto {
  to: string;
  message: string;
}

class SendEmailDto {
  to: string;
  subject: string;
  body: string;
}

class SendPushDto {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
