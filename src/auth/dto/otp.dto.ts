import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: '+2348012345678',
    description: 'User phone number used during registration',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code sent to the user',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class ResendOtpDto {
  @ApiProperty({
    example: '+2348012345678',
    description: 'User phone number to resend OTP to',
  })
  @IsPhoneNumber()
  phoneNumber: string;
}
