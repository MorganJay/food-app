import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DeliveryOrder,
  DeliveryOrderSchema,
} from '../schemas/DeliveryOrder.schema';
import { DeliveryOrdersService } from './delivery-orders.service';
import { DeliveryOrdersController } from './delivery-orders.controller';
import { DbglService } from '../dbgl/dbgl.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryOrder.name, schema: DeliveryOrderSchema },
    ]),
  ],
  providers: [DeliveryOrdersService, DbglService],
  controllers: [DeliveryOrdersController],
  exports: [DeliveryOrdersService, DbglService],
})
export class DeliveryOrdersModule {}
