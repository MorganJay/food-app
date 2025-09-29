import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './auth-guards';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto, VerifyOtpDto } from './dto/otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-otp')
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phoneNumber, dto.code);
  }

  @Post('resend-otp')
  resend(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto.phone);
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return req.user;
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/logout')
  async logout(@Request() req) {
    return req.logout();
  }
}
