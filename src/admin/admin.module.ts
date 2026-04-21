import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../schemas/User.schema';
import { Vendor, VendorSchema } from '../schemas/Vendor.schema';
import { Payment, PaymentSchema } from '../schemas/Payment.schema';
import { Rider, RiderSchema } from '../schemas/Rider.schema';
import { Order, OrderSchema } from '../schemas/Order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
