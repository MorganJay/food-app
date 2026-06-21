import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class NinVerificationDto {
  @ApiProperty({
    example: '98765432109',
    description: 'User NIN',
  })
  @IsString()
  @IsNotEmpty()
  nin: string;

 @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'picture of the NIN document',
  })
  ninDocument?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'live selfie picture of the vendor',
  })
  selfie?: any;
}

export class VerifyNinDto {
  @ApiProperty({
    example: '684a1c2d3e4f5a6b7c8d9e0f',
    description: 'Vendor ID to verify',
  })
  @IsMongoId()
  vendorId: string;
}