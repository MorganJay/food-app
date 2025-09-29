import { IsEmail, IsEnum, IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { UserRole } from '../../schemas/user.schema';

export class RegisterDto {
  @IsNotEmpty() firstName: string;
  @IsNotEmpty() lastName: string;

  @IsPhoneNumber() phone: string;

  @IsEmail() email: string;

  @IsEnum(UserRole) role: UserRole;
}
