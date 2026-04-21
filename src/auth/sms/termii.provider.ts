import { Injectable, Inject } from '@nestjs/common';
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
      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error('[Termii] Failed to send SMS:', error);
      return { success: false, reason: error.message };
    }
  }
}
