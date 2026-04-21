import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsPhoneNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { UserRole } from '../../schemas/User.schema';

export class RegisterDto {
  @IsNotEmpty() firstName: string;
  @IsNotEmpty() lastName: string;

  @IsPhoneNumber() phoneNumber: string;

  @IsEmail() email: string;

  @IsEnum(UserRole) role: UserRole;

  @IsOptional() @IsString() referralCode?: string;

  @IsOptional() @IsString() password?: string;
}
