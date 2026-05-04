import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { Injectable, BadRequestException } from '@nestjs/common';

import { OtpService } from '../otp/otp.service';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { OtpDeliveryService } from './otp-delivery.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private otpDelivery: OtpDeliveryService,
  ) { }

  private hashPassword(password: string) {
    return createHash('sha256').update(password).digest('hex');
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);

    // User must not exist
    if (!user) {
      return null;
    }

    // All users (including consumers) must verify phone before login
    if (!user.isPhoneVerified) {
      throw new BadRequestException(
        'Phone number not verified. Please verify your OTP first.',
      );
    }

    // Consumers login with phone only - no password validation needed
    if (user.role === 'consumer') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user as any;
      return result;
    }

    // Vendors, riders, and admins must provide valid password
    if (user && user.password && user.password === this.hashPassword(pass)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user as any;
      return result;
    }

    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user._id.toString(),
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findDuplicate(dto);

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    await this.usersService.upsertByPhoneNumber(dto.phoneNumber, dto);

    const recently = await this.otpService.lastSentWithin(dto.phoneNumber, 60);
    if (recently)
      throw new BadRequestException(
        'Please wait before requesting another code',
      );

    const code = await this.otpService.create(dto.phoneNumber);
    await this.otpDelivery.sendOtp(
      {
        phoneNumber: dto.phoneNumber,
        email: dto.email,
      },
      code,
    );
    console.log(`OTP sent to user: ${code}`);

    return { message: 'OTP sent' };
  }

  async resendOtp(phoneNumber: string) {
    const user = await this.usersService.findByPhoneNumber(phoneNumber);
    if (!user) throw new BadRequestException('User not found');

    const recently = await this.otpService.lastSentWithin(phoneNumber, 60);
    if (recently)
      throw new BadRequestException(
        'Please wait before requesting another code',
      );

    const code = await this.otpService.create(phoneNumber);
    await this.otpDelivery.sendOtp(
      {
        phoneNumber: user.phoneNumber,
        email: user.email,
      },
      code,
    );
    return { message: 'OTP resent' };
  }

  async verifyOtp(phoneNumber: string, code: string) {
    await this.otpService.verify(phoneNumber, code);

    const user = await this.usersService.verifyPhoneNumber(phoneNumber);
    const payload = { sub: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user };
  }

  async requestPasswordReset(phoneNumber: string) {
    const user = await this.usersService.findByPhoneNumber(phoneNumber);
    if (!user) throw new BadRequestException('User not found');

    const recently = await this.otpService.lastSentWithin(phoneNumber, 60);
    if (recently)
      throw new BadRequestException(
        'Please wait before requesting another code',
      );

    const code = await this.otpService.create(phoneNumber);
    await this.otpDelivery.sendOtp(
      { phoneNumber: user.phoneNumber, email: user.email },
      code,
    );
    return { message: 'Password reset code sent' };
  }

  async resetPassword(phoneNumber: string, code: string, newPassword: string) {
    await this.otpService.verify(phoneNumber, code);
    return this.usersService.setPassword(phoneNumber, newPassword);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    return this.usersService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
  }

  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    const isOTPFound = await this.otpService.doesPhoneWithOtpExist(
      phoneNumber,
      code,
    );
    return isOTPFound;
  }
}
