import {
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
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
  private readonly deliveryMode: string;
  private readonly infobipProvider: InfobipProvider;
  private readonly emailProvider = new DummyEmailProvider();
  private readonly pushProvider = new DummyPushProvider();

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.channels = (this.configService.get<string>('OTP_CHANNELS') || 'SMS')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

    // New: determine delivery mode. Default to RESPONSE when unset.
    this.deliveryMode = (
      this.configService.get<string>('OTP_DELIVERY_MODE') ||
      'RESPONSE'
    )
      .toString()
      .trim()
      .toUpperCase();

    this.infobipProvider = new InfobipProvider(this.configService);
  }

  // Returns either delivery results (for sending modes) or an object
  // indicating the delivery mode and code (for RESPONSE).
  async sendOtp(recipient: OtpRecipient, code: string) {
    // If configured to return the OTP in the API response, do not send SMS/email
    if (this.deliveryMode === 'RESPONSE') {
      this.logger.log('OTP_DELIVERY_MODE=RESPONSE; returning OTP in response');
      return { mode: 'RESPONSE', code };
    }

    const senders = [] as Promise<any>[];
    const smsRequired =
      this.channels.includes('SMS') && Boolean(recipient.phoneNumber);

    if (this.channels.includes('SMS') && recipient.phoneNumber) {
      this.logger.log(`Sending OTP via SMS to ${recipient.phoneNumber}`);
      senders.push(
        this.infobipProvider
          .sendOtp(recipient.phoneNumber, code)
          .then((result) => ({ ...result, channel: 'sms' }))
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
          .then((result) => ({ ...result, channel: 'email' }))
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
          .then((result) => ({ ...result, channel: 'whatsapp' }))
          .catch((err) => {
            this.logger.error(`WhatsApp failed: ${err.message}`);
            return { success: false, channel: 'whatsapp', error: err.message };
          }),
      );
    }

    if (this.channels.includes('PUSH') && recipient.pushToken) {
      this.logger.log(`Sending OTP via push to ${recipient.pushToken}`);
      senders.push(
        this.pushProvider
          .sendOtp(recipient.pushToken, code)
          .then(() => ({ channel: 'push', success: true }))
          .catch((err) => {
            this.logger.error(`Push failed: ${err.message}`);
            return { success: false, channel: 'push', error: err.message };
          }),
      );
    }

    if (senders.length === 0) {
      this.logger.warn(
        'No OTP delivery channels configured or recipient information missing',
      );
      if (this.channels.includes('SMS')) {
        throw new InternalServerErrorException(
          'Unable to send OTP via SMS: phone number or SMS channel unavailable',
        );
      }
      return;
    }

    const results = await Promise.all(senders);

    this.logger.log('OTP delivery results:', results);

    if (smsRequired) {
      const smsResult = results.find((result) => result?.channel === 'sms');
      if (!smsResult?.success) {
        const reason =
          smsResult?.error || smsResult?.reason || 'SMS delivery failed';
        throw new InternalServerErrorException(
          `Unable to send OTP via SMS: ${reason}`,
        );
      }
    }

    return results;
  }
}
