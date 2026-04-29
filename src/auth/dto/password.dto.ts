import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: '+2348012345678',
    description: 'User phone number',
  })
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: '+2348012345678',
    description: 'User phone number',
  })
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    example: 'StrongPassword123',
    description: 'New password',
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123',
    description: 'Current user password',
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewStrongPassword456',
    description: 'New password',
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
