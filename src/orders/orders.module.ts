import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { OrderEventsService } from './order-events.service';
import { Order, OrderSchema } from '../schemas/Order.schema';
import { Cart, CartSchema } from '../schemas/Cart.schema';
import { Vendor, VendorSchema } from '../schemas/Vendor.schema';
import { Rider, RiderSchema } from '../schemas/Rider.schema';
import {
  DeliveryAddress,
  DeliveryAddressSchema,
} from '../schemas/DeliveryAddress.schema';
import { Restaurant, RestaurantSchema } from 'src/schemas/Restaurant.schema';
import { User, UserSchema } from 'src/schemas/User.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: DeliveryAddress.name, schema: DeliveryAddressSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  providers: [OrdersService, OrdersGateway, OrderEventsService],
  controllers: [OrdersController],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
