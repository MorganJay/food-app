import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfobipProvider } from '../auth/sms/infobip.provider';

export interface SmsNotification {
  to: string;
  message: string;
}

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
}

export interface WhatsAppNotification {
  to: string;
  message: string;
}

export interface PushNotification {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly infobipProvider: InfobipProvider;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.infobipProvider = new InfobipProvider(configService);
  }

  async sendSms(notification: SmsNotification) {
    console.log(`[SMS OUTGOING] To: ${notification.to} | Message: ${notification.message}`);
    this.logger.log(`Sending SMS to ${notification.to}`);
    return this.infobipProvider.sendSms(notification.to, notification.message);
  }

  async sendEmail(notification: EmailNotification) {
    console.log(`[EMAIL OUTGOING] To: ${notification.to} | Subject: "${notification.subject}"`);
    console.log(`[EMAIL BODY]: ${notification.body}`);
    this.logger.log(`Sending email to ${notification.to}`);
    return this.infobipProvider.sendEmail(
      notification.to,
      notification.subject,
      notification.body,
    );
  }

  async sendWhatsApp(notification: WhatsAppNotification) {
    this.logger.log(`Sending WhatsApp to ${notification.to}`);
    return this.infobipProvider.sendMessage(
      notification.to,
      notification.message,
    );
  }

  async sendPush(notification: PushNotification) {
    console.log(`[PUSH OUTGOING] Token: ${notification.token} | Title: ${notification.title}`);
    console.log(`[PUSH BODY]: ${notification.body}`);
    this.logger.log(`Sending push to ${notification.token}`);
    // TODO: Integrate real push provider (Firebase FCM, etc.)
    return { success: true, messageId: `push-${Date.now()}` };
  }

  async sendBulkSms(notifications: SmsNotification[]) {
    const results = await Promise.all(
      notifications.map((n) => this.sendSms(n)),
    );
    return results;
  }
}