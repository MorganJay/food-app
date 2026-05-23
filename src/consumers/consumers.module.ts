import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsumersService } from './consumers.service';
import { ConsumersController } from './consumers.controller';
import { Consumer, ConsumerSchema } from '../schemas/Consumer.schema';
import { Vendor, VendorSchema } from '../schemas/Vendor.schema';
import {
  DeliveryAddress,
  DeliveryAddressSchema,
} from '../schemas/DeliveryAddress.schema';
import { DeliveryAddressesService } from './delivery-addresses.service';
import { DeliveryAddressesController } from './delivery-addresses.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Consumer.name, schema: ConsumerSchema },
      { name: DeliveryAddress.name, schema: DeliveryAddressSchema },
    ]),
    MongooseModule.forFeature([{ name: Vendor.name, schema: VendorSchema }]),
  ],
  providers: [ConsumersService, DeliveryAddressesService],
  controllers: [ConsumersController, DeliveryAddressesController],
  exports: [ConsumersService, DeliveryAddressesService],
})
export class ConsumersModule {}
