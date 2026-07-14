import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ImagePayloadDto {
  @ApiProperty({
    description: 'Secure Cloudinary URL of the image',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234/verification/nin.jpg',
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Cloudinary public asset ID',
    example: 'verification/nin_abc123',
  })
  @IsString()
  @IsNotEmpty()
  publicId: string;
}

export class NinVerificationDto {
  @ApiProperty({
    description: '11-digit National Identification Number (NIN)',
    example: '12345678901',
  })
  @IsString()
  @IsNotEmpty()
  nin: string;

  @ApiProperty({
    description: 'Pre-uploaded image properties for the physical NIN card document',
    type: ImagePayloadDto,
  })
  @ValidateNested()
  @Type(() => ImagePayloadDto)
  ninDocument: ImagePayloadDto;

  @ApiProperty({
    description: 'Pre-uploaded image properties for the live face selfie photo',
    type: ImagePayloadDto,
  })
  @ValidateNested()
  @Type(() => ImagePayloadDto)
  selfie: ImagePayloadDto;
}

export class VerifyNinDto {
  @ApiProperty({
    description: 'The target Vendor document reference ID',
    example: '64f123abc...',
  })
  @IsString()
  @IsNotEmpty()
  vendorId: string;
}