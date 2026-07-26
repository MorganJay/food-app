import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { InfobipSmsProvider } from '../auth/sms/infobip.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, InfobipSmsProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
