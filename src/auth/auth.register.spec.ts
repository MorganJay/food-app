import { AuthService } from './auth.service';

describe('AuthService register', () => {
  let auth: AuthService;

  beforeEach(() => {
    const usersService: any = {
      findDuplicate: jest.fn().mockResolvedValue(null),
      createByPhoneNumber: jest.fn().mockResolvedValue({ id: 'u1' }),
      findByPhoneNumber: jest.fn().mockResolvedValue(null),
    };

    const vendorsService: any = { createVendor: jest.fn().mockResolvedValue({}) };

    const jwtService: any = {};

    const otpService: any = {
      lastSentWithin: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue('555555'),
    };

    // We'll swap this per-test by overriding the instance method when needed
    const otpDelivery: any = {
      sendOtp: jest.fn().mockResolvedValue({ mode: 'RESPONSE', code: '555555' }),
    };

    auth = new AuthService(
      usersService,
      vendorsService,
      jwtService,
      otpService,
      otpDelivery,
    );
  });

  it('includes OTP in registration response when delivery mode is RESPONSE', async () => {
    const dto: any = { phoneNumber: '+100', username: 'u', email: 'a@b.com' };
    const result = await auth.register(dto);
    expect(result).toHaveProperty('otp', '555555');
    expect(result).toHaveProperty('message', 'OTP sent');
  });

  it('does not include OTP when delivery is not RESPONSE', async () => {
    // Create a new auth service with delivery returning non-RESPONSE
    const usersService: any = {
      findDuplicate: jest.fn().mockResolvedValue(null),
      createByPhoneNumber: jest.fn().mockResolvedValue({ id: 'u1' }),
    };

    const vendorsService: any = { createVendor: jest.fn().mockResolvedValue({}) };
    const jwtService: any = {};
    const otpService: any = {
      lastSentWithin: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue('777777'),
    };

    const otpDelivery: any = {
      sendOtp: jest.fn().mockResolvedValue([{ channel: 'sms', success: true }]),
    };

    const auth2 = new AuthService(usersService, vendorsService, jwtService, otpService, otpDelivery);
    const dto: any = { phoneNumber: '+200', username: 'v', email: 'c@d.com', role: undefined };
    const result = await auth2.register(dto);
    expect(result).toEqual({ message: 'OTP sent' });
  });
});
