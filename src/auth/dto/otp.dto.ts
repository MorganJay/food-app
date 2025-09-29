import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber() phoneNumber: string;
  @IsString() @Length(6, 6) code: string;
}

export class ResendOtpDto {
  @IsPhoneNumber() phone: string;
}
