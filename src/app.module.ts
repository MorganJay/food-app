import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, seconds } from '@nestjs/throttler';

import { AppService } from './app.service';
import { OtpModule } from './otp/otp.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { ProductsModule } from './products/products.module';
import { CartsModule } from './carts/carts.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { ConsumersModule } from './consumers/consumers.module';
import { VendorsModule } from './vendors/vendors.module';
import { FoodsModule } from './foods/foods.module';
import { RidersModule } from './riders/riders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: seconds(60), limit: 10 }]), // generic rate limit
    MongooseModule.forRoot(process.env.MONGO_URI),
    UsersModule,
    OtpModule,
    AuthModule,
    RestaurantsModule,
    ProductsModule,
    CartsModule,
    OrdersModule,
    DeliveriesModule,
    ConsumersModule,
    VendorsModule,
    FoodsModule,
    RidersModule,
    NotificationsModule,
    PaymentsModule,
    ReviewsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
