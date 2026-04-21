import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TermiiSmsProvider } from '../auth/sms/termii.provider';

export interface SmsNotification {
  to: string;
  message: string;
}

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
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
  private readonly smsProvider: TermiiSmsProvider;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.smsProvider = new TermiiSmsProvider(configService);
  }

  async sendSms(notification: SmsNotification) {
    this.logger.log(`Sending SMS to ${notification.to}`);
    return this.smsProvider.sendSms(notification.to, notification.message);
  }

  async sendEmail(notification: EmailNotification) {
    this.logger.log(`Sending email to ${notification.to}`);
    // TODO: Integrate real email provider (SendGrid, Mailgun, etc.)
    console.log(
      `[Email to ${notification.to}] Subject: ${notification.subject}`,
    );
    console.log(`[Email body]: ${notification.body}`);
    return { success: true, messageId: `email-${Date.now()}` };
  }

  async sendPush(notification: PushNotification) {
    this.logger.log(`Sending push to ${notification.token}`);
    // TODO: Integrate real push provider (Firebase FCM, etc.)
    console.log(`[Push to ${notification.token}] Title: ${notification.title}`);
    console.log(`[Push body]: ${notification.body}`);
    return { success: true, messageId: `push-${Date.now()}` };
  }

  async sendBulkSms(notifications: SmsNotification[]) {
    const results = await Promise.all(
      notifications.map((n) => this.sendSms(n)),
    );
    return results;
  }
}
