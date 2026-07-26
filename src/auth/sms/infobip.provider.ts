import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from '../interfaces/sms-provider.interface';
import { EmailProvider } from '../interfaces/email-provider.interface';
import { WhatsAppProvider } from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class InfobipProvider
  implements SmsProvider, EmailProvider, WhatsAppProvider
{
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly smsSenderId: string;
  private readonly whatsappSenderId: string;
  private readonly emailFromAddress: string;
  private readonly emailFromName: string;

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

    this.smsSenderId =
      this.configService.get<string>('INFOBIP_SMS_SENDER_ID') ||
      this.configService.get<string>('INFOBIP_SENDER_ID') ||
      'InfoSMS';

    this.whatsappSenderId =
      this.configService.get<string>('INFOBIP_WHATSAPP_SENDER_ID') || '';

    this.emailFromAddress =
      this.configService.get<string>('INFOBIP_EMAIL_FROM_ADDRESS') ||
      'noreply@chopbaze.com';

    this.emailFromName =
      this.configService.get<string>('INFOBIP_EMAIL_FROM_NAME') || 'Chopbaze';
  }

  // ======================== SMS Methods ========================
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
      const response = await fetch(`${this.baseUrl}/sms/3/messages`, {
        method: 'POST',
        headers: {
          Authorization: `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              from: this.smsSenderId,
              destinations: [{ to: normalizedPhone }],
              sender: this.smsSenderId,
              context: {
                text: message,
              },
            },
          ],
        }),
      });

      const result = await response.json();
      console.log(`[Infobip SMS] Sent to ${normalizedPhone}:`, result);

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
      console.error('[Infobip SMS] Failed:', error);

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

  // ======================== Email Methods ========================
  async sendEmailOtp(email: string, code: string) {
    return this.sendEmail(
      email,
      'Your OTP Code',
      `Your verification code is: <strong>${code}</strong>`,
    );
  }

  async sendEmail(email: string, subject: string, body: string) {
    if (!this.apiKey) {
      console.log(`[Infobip Mock] Email to ${email}: ${subject}`);
      return { success: false, reason: 'No API key configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/email/3/send`, {
        method: 'POST',
        headers: {
          Authorization: `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          from: {
            email: this.emailFromAddress,
            name: this.emailFromName,
          },
          to: [
            {
              email: email,
            },
          ],
          subject: subject,
          html: body,
        }),
      });

      const result = await response.json();
      console.log(`[Infobip Email] Sent to ${email}:`, result);

      if (!response.ok) {
        throw new BadRequestException(
          result?.requestError?.message ||
            result?.message ||
            'Failed to send email',
        );
      }

      const messageId = result?.messageId || result?.messages?.[0]?.messageId;
      if (!messageId) {
        throw new BadRequestException('Email failed: No message ID returned');
      }

      return {
        success: true,
        messageId: messageId,
      };
    } catch (error) {
      console.error('[Infobip Email] Failed:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Email delivery failed',
      );
    }
  }

  // ======================== WhatsApp Methods ========================
  async sendWhatsAppOtp(phoneNumber: string, code: string) {
    return this.sendMessage(phoneNumber, `Your verification code is: ${code}`);
  }

  async sendMessage(phoneNumber: string, message: string) {
    if (!this.apiKey) {
      console.log(`[Infobip Mock] WhatsApp to ${phoneNumber}: ${message}`);
      return { success: false, reason: 'No API key configured' };
    }

    if (!this.whatsappSenderId) {
      console.log(
        `[Infobip WhatsApp] No WhatsApp sender ID configured for ${phoneNumber}`,
      );
      return {
        success: false,
        reason: 'WhatsApp sender ID not configured',
      };
    }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    try {
      const response = await fetch(`${this.baseUrl}/whatsapp/1/message/text`, {
        method: 'POST',
        headers: {
          Authorization: `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          from: this.whatsappSenderId,
          to: normalizedPhone,
          messageText: message,
        }),
      });

      const result = await response.json();
      console.log(`[Infobip WhatsApp] Sent to ${normalizedPhone}:`, result);

      if (!response.ok) {
        throw new BadRequestException(
          result?.requestError?.message ||
            result?.message ||
            'Failed to send WhatsApp message',
        );
      }

      const messageId = result?.messageId || result?.messages?.[0]?.messageId;
      if (!messageId) {
        throw new BadRequestException(
          'WhatsApp failed: No message ID returned',
        );
      }

      return {
        success: true,
        messageId: messageId,
      };
    } catch (error) {
      console.error('[Infobip WhatsApp] Failed:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'WhatsApp delivery failed',
      );
    }
  }

  // ======================== Helpers ========================
  private normalizePhoneNumber(phone: string) {
    const cleaned = phone?.trim().replace(/\s+/g, '');
    if (!cleaned) {
      return cleaned;
    }

    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }
}
