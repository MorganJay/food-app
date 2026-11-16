import { Injectable } from '@nestjs/common';
import { EmailProvider } from '../interfaces/email-provider.interface';

@Injectable()
export class DummyEmailProvider implements EmailProvider {
  async sendOtp(email: string, code: string) {
    console.log(`[Dummy Email] OTP to ${email}: ${code}`);
    return { success: true, messageId: `dummy-email-${Date.now()}` };
  }

  async sendEmail(email: string, subject: string, body: string) {
    console.log(`[Dummy Email] to ${email}: ${subject}`);
    return { success: true, messageId: `dummy-email-${Date.now()}` };
  }
}
