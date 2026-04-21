import { EmailProvider } from '../interfaces/email-provider.interface';

export class DummyEmailProvider implements EmailProvider {
  async sendOtp(email: string, code: string) {
    console.log(`[Email to ${email}] Your OTP code is ${code}`);
  }
}
