export interface WhatsAppProvider {
  sendOtp(
    phoneNumber: string,
    code: string,
  ): Promise<{ success: boolean; messageId?: string; reason?: string }>;
  sendMessage(
    phoneNumber: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; reason?: string }>;
}
