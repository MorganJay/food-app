import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { OtpService } from '../otp/otp.service';
import { DummySmsProvider } from './sms/dummy-sms.provider';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

  private sms = new DummySmsProvider();

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterDto) {
    // Upsert user (phone/email unique)
    await this.usersService.upsertByPhone(dto.phone, dto);

    // prevent spamming
    const recently = await this.otpService.lastSentWithin(dto.phone, 60);
    if (recently)
      throw new BadRequestException(
        'Please wait before requesting another code',
      );

    const code = await this.otpService.create(dto.phone);
    await this.sms.sendOtp(dto.phone, code);

    return { message: 'OTP sent' };
  }

  async resendOtp(phone: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) throw new BadRequestException('User not found');

    const recently = await this.otpService.lastSentWithin(phone, 60);
    if (recently)
      throw new BadRequestException(
        'Please wait before requesting another code',
      );

    const code = await this.otpService.create(phone);
    await this.sms.sendOtp(phone, code);
    return { message: 'OTP resent' };
  }

  async verifyOtp(phone: string, code: string) {
    await this.otpService.verify(phone, code);

    const user = await this.usersService.verifyPhone(phone);
    const payload = { sub: user._id.toString(), role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user };
  }

  async verifyOTP(phone: string, code: string): Promise<boolean> {
    const isOTPFound = await this.otpService.doesPhoneWithOtpExist(phone, code);
    return isOTPFound;
  }
}
