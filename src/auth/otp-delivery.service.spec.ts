import { OtpDeliveryService } from './otp-delivery.service';
import { InfobipProvider } from './sms/infobip.provider';

describe('OtpDeliveryService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defaults to RESPONSE when OTP_DELIVERY_MODE is not set and returns the code', async () => {
    const mockConfig: any = {
      get: jest.fn((key: string) => {
        if (key === 'OTP_CHANNELS') return 'SMS';
        return undefined;
      }),
    };

    const spy = jest
      .spyOn(InfobipProvider.prototype, 'sendOtp')
      .mockResolvedValue({ success: true, messageId: 'm1' } as any);

    const svc = new OtpDeliveryService(mockConfig);
    const result: any = await svc.sendOtp({ phoneNumber: '+1000000000', email: 'a@b.com' }, '123456');

    expect(result).toEqual({ mode: 'RESPONSE', code: '123456' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends SMS when OTP_DELIVERY_MODE=SMS and returns delivery results', async () => {
    const mockConfig: any = {
      get: jest.fn((key: string) => {
        if (key === 'OTP_CHANNELS') return 'SMS';
        if (key === 'OTP_DELIVERY_MODE') return 'SMS';
        return undefined;
      }),
    };

    jest
      .spyOn(InfobipProvider.prototype, 'sendOtp')
      .mockResolvedValue({ success: true, messageId: 'msg-1' });

    const svc = new OtpDeliveryService(mockConfig);
    const result: any = await svc.sendOtp({ phoneNumber: '+1000000000', email: 'a@b.com' }, '999999');

    expect(Array.isArray(result)).toBe(true);
    const smsResult = (result as any[]).find((r: any) => r?.channel === 'sms');
    expect(smsResult).toBeDefined();
    expect(smsResult.success).toBe(true);
  });
});
