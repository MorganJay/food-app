import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, seconds } from '@nestjs/throttler';

import { AppService } from './app.service';
import { OtpModule } from './otp/otp.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: seconds(60), limit: 10 }]), // generic rate limit
    MongooseModule.forRoot(process.env.MONGO_URI),
    UsersModule,
    OtpModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
