import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class NinVerificationDto {
  @ApiProperty({
    example: '98765432109',
    description: 'User NIN number',
  })
  @IsString()
  @IsNotEmpty()
  ninNumber: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Selfie or NIN verification image',
  })
  ninPhoto?: any;
}

export class VerifyNinDto {
  @ApiProperty({
    example: '684a1c2d3e4f5a6b7c8d9e0f',
    description: 'Vendor ID to verify',
  })
  @IsMongoId()
  vendorId: string;
}