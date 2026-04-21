export interface PushProvider {
  sendOtp(pushToken: string, code: string): Promise<void>;
}
