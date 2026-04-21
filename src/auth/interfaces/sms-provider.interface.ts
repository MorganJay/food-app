export interface SmsProvider {
  sendOtp(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; messageId?: string; reason?: string }>;
  sendSms(
    phone: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; reason?: string }>;
}
