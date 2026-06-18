import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { Vendor, VendorSchema } from '../schemas/Vendor.schema';
import { VendorBankAccountController } from './vendor-bank-account.controller';
import { VendorBankAccount, VendorBankAccountSchema } from 'src/schemas/VendorBankAccount.schema';
import { VendorBankAccountService } from './vendor-bank-account.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: VendorBankAccount.name, schema: VendorBankAccountSchema },
    ]),
  ],
  providers: [VendorsService, VendorBankAccountService],
  controllers: [VendorsController, VendorBankAccountController],
  exports: [VendorsService, VendorBankAccountService],
})
export class VendorsModule {}
