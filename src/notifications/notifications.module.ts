import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TermiiSmsProvider } from '../auth/sms/termii.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, TermiiSmsProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
