import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review, ReviewSchema } from '../schemas/Review.schema';
import { Food, FoodSchema } from '../schemas/Food.schema';
import { Vendor, VendorSchema } from '../schemas/Vendor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Food.name, schema: FoodSchema },
      { name: Vendor.name, schema: VendorSchema },
    ]),
  ],
  providers: [ReviewsService],
  controllers: [ReviewsController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
