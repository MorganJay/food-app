export interface EmailProvider {
  sendOtp(
    email: string,
    code: string,
  ): Promise<{ success: boolean; messageId?: string; reason?: string }>;
  sendEmail(
    email: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string; reason?: string }>;
}
