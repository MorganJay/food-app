import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfobipProvider } from '../auth/sms/infobip.provider';

export interface SmsNotification {
  to: string;
  message: string;
  eventType?: string;
  recipientId?: string;
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
    const eventType = notification.eventType || 'unspecified';
    const recipientId = notification.recipientId || 'unknown';
    const phone = notification.to?.trim().replace(/[\s()-]/g, '');
    const e164Phone = phone?.startsWith('+') ? phone : `+${phone || ''}`;

    if (!/^\+[1-9]\d{7,14}$/.test(e164Phone)) {
      this.logger.warn(
        `SMS skipped: event=${eventType} recipientId=${recipientId} channel=sms reason=invalid_phone_number`,
      );
      return { success: false, reason: 'Invalid phone number' };
    }

    try {
      const result = await this.infobipProvider.sendSms(
        e164Phone,
        notification.message,
      );
      if (result?.success) {
        this.logger.log(
          `SMS accepted by Infobip; delivery not confirmed: event=${eventType} recipientId=${recipientId} channel=sms messageId=${result.messageId || 'unavailable'}`,
        );
      } else {
        this.logger.warn(
          `SMS not accepted by Infobip: event=${eventType} recipientId=${recipientId} channel=sms reason=${result?.reason || 'unknown'}`,
        );
      }
      return result;
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `SMS failed: event=${eventType} recipientId=${recipientId} channel=sms error=${details}`,
      );
      throw error;
    }
  }

  async sendEmail(notification: EmailNotification) {
    console.log(
      `[EMAIL OUTGOING] To: ${notification.to} | Subject: "${notification.subject}"`,
    );
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
    console.log(
      `[PUSH OUTGOING] Token: ${notification.token} | Title: ${notification.title}`,
    );
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
