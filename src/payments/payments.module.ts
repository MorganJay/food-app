import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Payment, PaymentSchema } from 'src/schemas/Payment.schema';
import { Order, OrderSchema } from 'src/schemas/Order.schema';
import { User, UserSchema } from 'src/schemas/User.schema';

@Module({
  imports: [
    OrdersModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema }
    ]),
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}