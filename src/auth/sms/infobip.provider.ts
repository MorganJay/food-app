import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from '../interfaces/sms-provider.interface';

@Injectable()
export class InfobipSmsProvider implements SmsProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly senderId: string;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('INFOBIP_API_KEY') ||
      this.configService.get<string>('TERMII_API_KEY') ||
      '';

    this.baseUrl = (
      this.configService.get<string>('INFOBIP_BASE_URL') ||
      this.configService.get<string>('TERMII_BASE_URL') ||
      'https://api.infobip.com'
    ).replace(/\/$/, '');

    this.senderId =
      this.configService.get<string>('INFOBIP_SENDER_ID') ||
      this.configService.get<string>('TERMII_SENDER_ID') ||
      'InfoSMS';
  }

  async sendOtp(phone: string, code: string) {
    return this.sendSms(phone, `Your verification code is: ${code}`);
  }

  async sendSms(phone: string, message: string) {
    if (!this.apiKey) {
      console.log(`[Infobip Mock] SMS to ${phone}: ${message}`);
      return { success: false, reason: 'No API key configured' };
    }

    const normalizedPhone = this.normalizePhoneNumber(phone);

    try {
      const response = await fetch(`${this.baseUrl}/sms/2/text/advanced`, {
        method: 'POST',
        headers: {
          Authorization: `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              from: this.senderId,
              destinations: [{ to: normalizedPhone }],
              text: message,
            },
          ],
        }),
      });

      const result = await response.json();
      console.log(`[Infobip] SMS sent to ${normalizedPhone}:`, result);

      if (!response.ok) {
        throw new BadRequestException(
          result?.requestError?.message ||
            result?.message ||
            'Failed to send SMS',
        );
      }

      const firstMessage = result?.messages?.[0];
      if (!firstMessage?.messageId && !firstMessage?.status?.id) {
        throw new BadRequestException('SMS failed: No message ID returned');
      }

      return {
        success: true,
        messageId: firstMessage.messageId || firstMessage.status.id.toString(),
      };
    } catch (error) {
      console.error('[Infobip] Failed to send SMS:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'SMS delivery failed',
      );
    }
  }

  private normalizePhoneNumber(phone: string) {
    const cleaned = phone?.trim().replace(/\s+/g, '');
    if (!cleaned) {
      return cleaned;
    }

    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }
}
