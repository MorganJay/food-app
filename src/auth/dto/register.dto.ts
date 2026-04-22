import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsPhoneNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { UserRole } from '../../schemas/User.schema';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'john_doe',
    description: 'Unique username for the user',
  })
  // @IsNotEmpty()
  username?: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: '+2348012345678',
    description: 'User phone number',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    example: 'john@gmail.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.CONSUMER,
    description: 'Role of the user',
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: 'REF-ABC123',
    description: 'Optional referral code',
  })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiProperty({
    example: 'StrongPassword123',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
