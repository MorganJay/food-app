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
              sender: this.smsSenderId,
              destinations: [{ to: normalizedPhone }],
              content: {
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

  async sendEmail(to: string, subject: string, body: string) {
    if (!this.apiKey) {
      console.log(`[Infobip Mock] Email to ${to}: ${subject}`);
      return { success: false, reason: 'No API key configured' };
    }

    try {
      const formData = new FormData();

      // Format sender as: "Chopbaze <noreply@chopbaze.com>" or fallback to email address
      const formattedFrom = this.emailFromName
        ? `${this.emailFromName} <${this.emailFromAddress}>`
        : this.emailFromAddress;

      formData.append('from', formattedFrom);
      formData.append('to', to);
      formData.append('subject', subject);
      
      // Convert newlines (\n) to HTML line breaks (<br/>) if html wrapper is missing
      const htmlContent = body.includes('<') ? body : body.replace(/\n/g, '<br/>');
      formData.append('html', htmlContent);
      formData.append('text', body.replace(/<[^>]*>/g, '')); // Plain text strip

      const response = await fetch(`${this.baseUrl}/email/3/send`, {
        method: 'POST',
        headers: {
          Authorization: `App ${this.apiKey}`,
        },
        body: formData,
      });

      const result = await response.json();
      console.log(`[Infobip Email API Response] Sent to ${to}:`, result);

      if (!response.ok) {
        const errorMsg =
          result?.requestError?.serviceException?.text ||
          result?.message ||
          'Failed to send email via Infobip';
        
        console.error(`[Infobip Email Error Response]:`, result);
        throw new BadRequestException(`Infobip email error: ${errorMsg}`);
      }

      const messageId =
        result?.messages?.[0]?.messageId || result?.bulkId || 'SUCCESS';

      return {
        success: true,
        messageId,
        details: result,
      };
    } catch (error) {
      console.error('[Infobip Email] Send failed:', error);
      if (error instanceof BadRequestException) throw error;
      const err = error as Error;
      throw new BadRequestException(`Failed to send email: ${err.message}`);
    }
  }

  // async sendEmail(to: string, subject: string, body: string) {
  //   try {
  //     // Build multipart/form-data
  //     const formData = new FormData();
  //     formData.append('from', this.emailFromAddress);
  //     formData.append('to', to);
  //     formData.append('subject', subject);
  //     formData.append('text', body); // or 'html' if sending HTML content

  //     // Fetch without explicit Content-Type header 
  //     // (fetch automatically sets multipart/form-data with boundary)
  //     const response = await fetch(`${this.baseUrl}/email/3/send`, {
  //       method: 'POST',
  //       headers: {
  //         Authorization: `App ${this.apiKey}`,
  //       },
  //       body: formData,
  //     });

  //     const data = await response.json();

  //     if (!response.ok) {
  //       console.error('[Infobip Email] Sent error response:', data);
  //       throw new BadRequestException(
  //         `Infobip email error: ${data?.requestError?.serviceException?.text || 'Failed to send email'}`,
  //       );
  //     }

  //     return data;
  //   } catch (error) {
  //     if (error instanceof BadRequestException) throw error;
  //     const err = error as Error;
  //     throw new BadRequestException(`Failed to send email: ${err.message}`);
  //   }
  // }

  // async sendEmail(email: string, subject: string, body: string) {
  //   if (!this.apiKey) {
  //     console.log(`[Infobip Mock] Email to ${email}: ${subject}`);
  //     return { success: false, reason: 'No API key configured' };
  //   }

  //   try {
  //     const response = await fetch(`${this.baseUrl}/email/3/send`, {
  //       method: 'POST',
  //       headers: {
  //         Authorization: `App ${this.apiKey}`,
  //         'Content-Type': 'application/json',
  //         Accept: 'application/json',
  //       },
  //       body: JSON.stringify({
  //         from: {
  //           email: this.emailFromAddress,
  //           name: this.emailFromName,
  //         },
  //         to: [
  //           {
  //             email: email,
  //           },
  //         ],
  //         subject: subject,
  //         html: body,
  //       }),
  //     });

  //     const result = await response.json();
  //     console.log(`[Infobip Email] Sent to ${email}:`, result);

  //     if (!response.ok) {
  //       throw new BadRequestException(
  //         result?.requestError?.message ||
  //           result?.message ||
  //           'Failed to send email',
  //       );
  //     }

  //     const messageId = result?.messageId || result?.messages?.[0]?.messageId;
  //     if (!messageId) {
  //       throw new BadRequestException('Email failed: No message ID returned');
  //     }

  //     return {
  //       success: true,
  //       messageId: messageId,
  //     };
  //   } catch (error) {
  //     console.error('[Infobip Email] Failed:', error);

  //     if (
  //       error instanceof BadRequestException ||
  //       error instanceof InternalServerErrorException
  //     ) {
  //       throw error;
  //     }

  //     throw new InternalServerErrorException(
  //       error instanceof Error ? error.message : 'Email delivery failed',
  //     );
  //   }
  // }

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
