import { JwtService } from '@nestjs/jwt';
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { OtpService } from '../otp/otp.service';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { OtpDeliveryService } from './otp-delivery.service';
import { UserRole } from '../schemas/User.schema';
import { isBcryptHash, verifyPassword } from '../common/password.util';
import { VendorsService } from 'src/vendors/vendors.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private vendorsService: VendorsService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private otpDelivery: OtpDeliveryService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);

    if (!user) {
      return null;
    }

    if (!user.isPhoneVerified) {
      throw new BadRequestException(
        'Phone number not verified. Please verify your OTP first.',
      );
    }

    if (user.role === UserRole.CONSUMER) {
      throw new UnauthorizedException(
        'Consumers must sign in with POST /auth/verify-otp, not password login.',
      );
    }

    if (!(await verifyPassword(pass, user.password))) {
      return null;
    }

    if (user.password && !isBcryptHash(user.password)) {
      await this.usersService.rehashPasswordToBcrypt(user._id.toString(), pass);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user as any;
    return result;
  }

  async login(user: any) {
    if (user.role === UserRole.VENDOR) {
      const vendorProfile = await this.vendorsService
        .findById(user._id.toString())
        .catch(() => null);

      if (!vendorProfile) {
        // Auto-generate the missing merchant shell for this legacy user
        await this.vendorsService.createVendor(user._id.toString(), {
          businessName: `${user.username}'s Kitchen`,
          description: 'Welcome to my store!',
          location: undefined,
        });
      }
    }
    const payload = {
      username: user.username,
      phoneNumber: user.phoneNumber,
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

    const newUser = await this.usersService.createByPhoneNumber(
      dto.phoneNumber,
      dto,
    );

    if (dto.role === 'vendor') {
      const shortPhone = dto.phoneNumber.slice(-4);
      const uniquePlaceholderName = `${dto.username}'s Kitchen (${shortPhone})`;

      await this.vendorsService.createVendor(newUser.id, {
        businessName: uniquePlaceholderName,
        description: 'Welcome to my store!',
        location: undefined,
      });
    }

    const recently = await this.otpService.lastSentWithin(dto.phoneNumber, 60);
    if (recently)
      throw new BadRequestException(
        'Please wait before requesting another code',
      );

    const code = await this.otpService.create(dto.phoneNumber);
    const deliveryResult = await this.otpDelivery.sendOtp(
      {
        phoneNumber: dto.phoneNumber,
        email: dto.email,
      },
      code,
    );

    // If the delivery service indicates RESPONSE mode, include the OTP
    if (deliveryResult && !Array.isArray(deliveryResult) && (deliveryResult as any).mode === 'RESPONSE') {
      return { message: 'OTP sent', otp: code };
    }

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

  async sendVerificationCode(phoneNumber: string) {
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
    return { message: 'Verification code sent' };
  }

  async verifyOtp(phoneNumber: string, code: string) {
    await this.otpService.verify(phoneNumber, code);

    const user = await this.usersService.verifyPhoneNumber(phoneNumber);

    const payload = {
      sub: user.id,
      role: user.role,
      username: user.username,
      phoneNumber: user.phoneNumber,
    };
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
