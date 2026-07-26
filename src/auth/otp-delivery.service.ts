import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfobipProvider } from './sms/infobip.provider';
import { DummyEmailProvider } from './email/dummy-email.provider';
import { DummyPushProvider } from './push/dummy-push.provider';

export interface OtpRecipient {
  phoneNumber: string;
  email: string;
  pushToken?: string;
}

@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);
  private readonly channels: string[];
  private readonly infobipProvider: InfobipProvider;
  private readonly emailProvider = new DummyEmailProvider();
  private readonly pushProvider = new DummyPushProvider();

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.channels = (this.configService.get<string>('OTP_CHANNELS') || 'SMS')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

    this.infobipProvider = new InfobipProvider(this.configService);
  }

  async sendOtp(recipient: OtpRecipient, code: string) {
    const senders = [] as Promise<any>[];

    if (this.channels.includes('SMS') && recipient.phoneNumber) {
      this.logger.log(`Sending OTP via SMS to ${recipient.phoneNumber}`);
      senders.push(
        this.infobipProvider
          .sendOtp(recipient.phoneNumber, code)
          .catch((err) => {
            this.logger.error(`SMS failed: ${err.message}`);
            return { success: false, channel: 'sms', error: err.message };
          }),
      );
    }

    if (this.channels.includes('EMAIL') && recipient.email) {
      this.logger.log(`Sending OTP via email to ${recipient.email}`);
      senders.push(
        this.infobipProvider
          .sendEmailOtp(recipient.email, code)
          .catch((err) => {
            this.logger.error(`Email failed: ${err.message}`);
            return { success: false, channel: 'email', error: err.message };
          }),
      );
    }

    if (this.channels.includes('WHATSAPP') && recipient.phoneNumber) {
      this.logger.log(`Sending OTP via WhatsApp to ${recipient.phoneNumber}`);
      senders.push(
        this.infobipProvider
          .sendWhatsAppOtp(recipient.phoneNumber, code)
          .catch((err) => {
            this.logger.error(`WhatsApp failed: ${err.message}`);
            return { success: false, channel: 'whatsapp', error: err.message };
          }),
      );
    }

    if (this.channels.includes('PUSH') && recipient.pushToken) {
      this.logger.log(`Sending OTP via push to ${recipient.pushToken}`);
      senders.push(
        this.pushProvider.sendOtp(recipient.pushToken, code).catch((err) => {
          this.logger.error(`Push failed: ${err.message}`);
          return { success: false, channel: 'push', error: err.message };
        }),
      );
    }

    if (senders.length === 0) {
      this.logger.warn(
        'No OTP delivery channels configured or recipient information missing',
      );
      return;
    }

    // await Promise.all(senders);
    const results = await Promise.all(senders);

    this.logger.log('OTP delivery results:', results);

    return results;
  }
}
