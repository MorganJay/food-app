import { Injectable, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from '../interfaces/sms-provider.interface';

@Injectable()
export class TermiiSmsProvider implements SmsProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.ng.termii.com/api';
  private readonly senderId = 'Chopbaze';

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TERMII_API_KEY') || '';
  }

  async sendOtp(phone: string, code: string) {
    return this.sendSms(phone, `Your verification code is: ${code}`);
  }

  async sendSms(phone: string, message: string) {
    if (!this.apiKey) {
      console.log(`[Termii Mock] SMS to ${phone}: ${message}`);
      return { success: false, reason: 'No API key configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          to: phone,
          from: this.senderId,
          sms: message,
          type: 'plain',
          channel: 'dnd',
        }),
      });

      const result = await response.json();
      console.log(`[Termii] SMS sent to ${phone}:`, result);

      if (!response.ok) {
        throw new BadRequestException(result.message || 'Failed to send SMS');
      }

      if (!result.message_id) {
        throw new BadRequestException('SMS failed: No message ID returned');
      }

      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error('[Termii] Failed to send SMS:', error);

      throw new InternalServerErrorException(error.message || 'SMS delivery failed');

      // return { success: false, reason: error.message };
    }
  }
}
