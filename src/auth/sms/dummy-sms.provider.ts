import { SmsProvider } from '../interfaces/sms-provider.interface';

export class DummySmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    console.log(`[SMS to ${phone}] Your code is ${code}`);
  }
}
