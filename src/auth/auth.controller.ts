import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import {
  RequestPasswordResetDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/password.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './auth-guards';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './strategies/jwt.strategy';
import { ResendOtpDto, VerifyOtpDto } from './dto/otp.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request, validation failed or user already exists',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phoneNumber, dto.code);
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP code' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  resend(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto.phoneNumber);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login with username/email and password' })
  @ApiBody({
    schema: {
      example: {
        username: 'johndoe@example.com',
        password: 'password123',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. For consumers: use phone number as username and any password.',
  })
  async login(@Request() req) {
    return this.auth.login(req.user);
  }

  @UseGuards(LocalAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req) {
    return req.logout();
  }

  @Post('password/request-reset')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'Reset OTP sent' })
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(body.phoneNumber);
  }

  @Post('password/reset')
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(
      body.phoneNumber,
      body.code,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('password/change')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Body() body: ChangePasswordDto, @Request() req) {
    return this.auth.changePassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }
}
