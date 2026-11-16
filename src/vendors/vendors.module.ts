import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { Vendor, VendorSchema } from '../schemas/Vendor.schema';
import { VendorBankAccountController } from './vendor-bank-account.controller';
import {
  VendorBankAccount,
  VendorBankAccountSchema,
} from 'src/schemas/VendorBankAccount.schema';
import { VendorBankAccountService } from './vendor-bank-account.service';
import { Bank, BankSchema } from 'src/schemas/Bank.schema';
import { Order, OrderSchema } from 'src/schemas/Order.schema';
import { Restaurant, RestaurantSchema } from 'src/schemas/Restaurant.schema';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: VendorBankAccount.name, schema: VendorBankAccountSchema },
      { name: Bank.name, schema: BankSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    OrdersModule,
  ],
  providers: [VendorsService, VendorBankAccountService],
  controllers: [VendorsController, VendorBankAccountController],
  exports: [MongooseModule, VendorsService, VendorBankAccountService],
})
export class VendorsModule {}
