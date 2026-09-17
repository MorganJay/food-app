import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateVendorBankAccountDto {
  @ApiProperty({
    description: 'Name of the bank account holder (Should match the verified BVN/NIN name)',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({
    description: '10-digit NUBAN bank account number',
    example: '0123456789',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  accountNumber: string;

  @ApiProperty({
    description: 'The official routing code of the bank fetched from the GET /banks endpoint',
    example: '058',
  })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiPropertyOptional({
    description: 'Whether this account should be set as the vendor default payout account',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateVendorBankAccountDto extends PartialType(
  CreateVendorBankAccountDto,
) {}

export class VendorBankAccountResponseDto {
  @ApiProperty({
    description: 'Unique bank account identifier',
    example: '6850ab1234567890abcdef12',
  })
  id: string;

  @ApiProperty({
    description: 'Vendor profile wrapper identifier',
    example: '684fa91234567890abcdef12',
  })
  vendorId: string;

  @ApiProperty({
    description: 'Name of the bank account holder',
    example: 'John Doe',
  })
  accountName: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '0123456789',
  })
  accountNumber: string;

  @ApiProperty({
    description: 'The official name of the bank mapped internally from your seed database',
    example: 'Guaranty Trust Bank',
  })
  bankName: string;

  @ApiProperty({
    description: 'The unique Paystack-compliant bank code',
    example: '058',
  })
  bankCode: string;

  @ApiProperty({
    description: 'Indicates whether this is the default account',
    example: true,
  })
  isDefault: boolean;

  @ApiProperty({
    description: 'Date the account was created',
    example: '2026-06-18T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date the account was last updated',
    example: '2026-06-18T10:45:00.000Z',
  })
  updatedAt: Date;
}