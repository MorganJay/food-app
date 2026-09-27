import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  isPhoneVerified: boolean;

  @ApiProperty()
  role: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ example: 1 })
  serialNumber: number;
}

export class UpdateUserProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

// Reusable payload structure matching frontend expectations
export class ImagePayloadDto {
  @ApiProperty({
    description: 'Secure image URL returned by the upload utility',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234/avatars/user_1.jpg',
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Cloudinary public identifier string',
    example: 'avatars/user_1_abc123',
  })
  @IsString()
  @IsNotEmpty()
  publicId: string;
}

export class UpdateAvatarDto {
  @ApiProperty({
    description: 'Pre-uploaded user profile image metrics object',
    type: ImagePayloadDto,
  })
  @ValidateNested()
  @Type(() => ImagePayloadDto)
  @IsNotEmpty()
  avatar: ImagePayloadDto;
}