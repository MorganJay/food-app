import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsumersService } from './consumers.service';
import { ConsumersController } from './consumers.controller';
import { Consumer, ConsumerSchema } from '../schemas/Consumer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Consumer.name, schema: ConsumerSchema },
    ]),
  ],
  providers: [ConsumersService],
  controllers: [ConsumersController],
  exports: [ConsumersService],
})
export class ConsumersModule {}
