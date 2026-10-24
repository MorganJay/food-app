import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from '../schemas/Product.schema';
import { Restaurant, RestaurantSchema } from '../schemas/Restaurant.schema';
import { Vendor, VendorSchema } from 'src/schemas/Vendor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Vendor.name, schema: VendorSchema },
    ]),
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
