import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RidersService } from './riders.service';
import { RidersController } from './riders.controller';
import { Rider, RiderSchema } from '../schemas/Rider.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rider.name, schema: RiderSchema }]),
  ],
  providers: [RidersService],
  controllers: [RidersController],
  exports: [RidersService],
})
export class RidersModule {}
