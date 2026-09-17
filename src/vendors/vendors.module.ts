import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { Vendor, VendorSchema } from '../schemas/Vendor.schema';
import { VendorBankAccountController } from './vendor-bank-account.controller';
import { VendorBankAccount, VendorBankAccountSchema } from 'src/schemas/VendorBankAccount.schema';
import { VendorBankAccountService } from './vendor-bank-account.service';
import { Bank, BankSchema } from 'src/schemas/Bank.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: VendorBankAccount.name, schema: VendorBankAccountSchema },
      { name: Bank.name, schema: BankSchema },
    ]),
  ],
  providers: [VendorsService, VendorBankAccountService],
  controllers: [VendorsController, VendorBankAccountController],
  exports: [MongooseModule, VendorsService, VendorBankAccountService],
})
export class VendorsModule {}
