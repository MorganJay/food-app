import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { InfobipProvider } from '../auth/sms/infobip.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, InfobipProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
