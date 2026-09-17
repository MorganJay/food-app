import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsumersService } from './consumers.service';
import { ConsumersController } from './consumers.controller';
import { Consumer, ConsumerSchema } from '../schemas/Consumer.schema';
import {
  DeliveryAddress,
  DeliveryAddressSchema,
} from '../schemas/DeliveryAddress.schema';
import { DeliveryAddressesService } from './delivery-addresses.service';
import { DeliveryAddressesController } from './delivery-addresses.controller';
import { Restaurant, RestaurantSchema } from 'src/schemas/Restaurant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Consumer.name, schema: ConsumerSchema },
      { name: DeliveryAddress.name, schema: DeliveryAddressSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    // MongooseModule.forFeature([{ name: Restaurant.name, schema: RestaurantSchema }]),
    // MongooseModule.forFeature([{ name: Vendor.name, schema: VendorSchema }]),
  ],
  providers: [ConsumersService, DeliveryAddressesService],
  controllers: [ConsumersController, DeliveryAddressesController],
  exports: [ConsumersService, DeliveryAddressesService],
})
export class ConsumersModule {}
