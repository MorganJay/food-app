import { PushProvider } from '../interfaces/push-provider.interface';

export class DummyPushProvider implements PushProvider {
  async sendOtp(pushToken: string, code: string) {
    console.log(`[Push to ${pushToken}] Your OTP code is ${code}`);
  }
}
