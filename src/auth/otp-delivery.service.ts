import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TermiiSmsProvider } from './sms/termii.provider';
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
  private readonly smsProvider: TermiiSmsProvider;
  private readonly emailProvider = new DummyEmailProvider();
  private readonly pushProvider = new DummyPushProvider();

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.channels = (this.configService.get<string>('OTP_CHANNELS') || 'SMS')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

    this.smsProvider = new TermiiSmsProvider(this.configService);
  }

  async sendOtp(recipient: OtpRecipient, code: string) {
    const senders = [] as Promise<any>[];

    if (this.channels.includes('SMS') && recipient.phoneNumber) {
      this.logger.log(`Sending OTP via SMS to ${recipient.phoneNumber}`);
      senders.push(this.smsProvider.sendOtp(recipient.phoneNumber, code));
    }

    if (this.channels.includes('EMAIL') && recipient.email) {
      this.logger.log(`Sending OTP via email to ${recipient.email}`);
      senders.push(this.emailProvider.sendOtp(recipient.email, code));
    }

    if (this.channels.includes('PUSH') && recipient.pushToken) {
      this.logger.log(`Sending OTP via push to ${recipient.pushToken}`);
      senders.push(this.pushProvider.sendOtp(recipient.pushToken, code));
    }

    if (senders.length === 0) {
      this.logger.warn(
        'No OTP delivery channels configured or recipient information missing',
      );
      return;
    }

    await Promise.all(senders);
  }
}
