import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { OtpModule } from '../otp/otp.module';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { OtpDeliveryService } from './otp-delivery.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    OtpModule,
    PassportModule,
    // JwtModule.register({
    //   secret: process.env.JWT_SECRET,
    //   signOptions: { expiresIn: '60s' },
    // }),
    // Alternatively, you can use ConfigService to get the secret
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60s' },
      }),
    })
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, OtpDeliveryService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
