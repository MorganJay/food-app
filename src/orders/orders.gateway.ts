import { OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UserRole } from '../schemas/User.schema';
import { OrdersService } from './orders.service';
import { OrderEventsService, OrderEventPayload } from './order-events.service';

@WebSocketGateway({ namespace: 'orders', cors: { origin: '*' } })
export class OrdersGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly ordersService: OrdersService,
    private readonly orderEvents: OrderEventsService,
  ) {}

  onModuleInit() {
    // Subscribe gateway to internal event bus on startup
    this.orderEvents.subscribe((event) => this.handleOrderEvent(event));
  }

  private handleOrderEvent(event: OrderEventPayload) {
    if (!event.order) return;

    // Emit rider assignment payload if rider event occurs
    if (event.type === 'OrderOutForDeliveryEvent') {
      this.emitRiderAssignment(event.order);
    }

    // Emit order updates to room subscribers for ALL status transitions (accepted, preparing, paid, etc.)
    this.emitOrderStatus(event.order);
  }

  @SubscribeMessage('subscribeOrder')
  async subscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { token?: string; orderId?: string },
  ) {
    if (!body?.token || !body?.orderId) {
      return { ok: false, error: 'token and orderId required' };
    }
    let payload: { sub: string; role: UserRole };
    try {
      payload = this.jwt.verify(body.token) as { sub: string; role: UserRole };
    } catch {
      return { ok: false, error: 'invalid token' };
    }
    try {
      await this.ordersService.assertOrderAccessible(body.orderId, {
        sub: payload.sub,
        role: payload.role,
      });
    } catch {
      return { ok: false, error: 'forbidden' };
    }
    await client.join(`order:${body.orderId}`);
    return { ok: true };
  }

  emitOrderStatus(order: any) {
    const orderId = order._id?.toString() || order.id;
    this.server.to(`order:${orderId}`).emit('orderStatusUpdated', order);
  }

  emitRiderAssignment(order: any) {
    const orderId = order._id?.toString() || order.id;
    this.server.to(`order:${orderId}`).emit('orderRiderAssigned', order);
  }
}