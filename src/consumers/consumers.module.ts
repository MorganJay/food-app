import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsumersService } from './consumers.service';
import { ConsumersController } from './consumers.controller';
import { Consumer, ConsumerSchema } from '../schemas/Consumer.schema';
import { Vendor, VendorSchema } from 'src/schemas/Vendor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Consumer.name, schema: ConsumerSchema },
    ]),
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
    ]),
  ],
  providers: [ConsumersService],
  controllers: [ConsumersController],
  exports: [ConsumersService],
})
export class ConsumersModule { }
