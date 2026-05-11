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

@WebSocketGateway({ namespace: 'orders', cors: { origin: '*' } })
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Clients must join with a valid JWT and an orderId they are allowed to see.
   * Server emits order events only to room `order:<orderId>`.
   */
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

  emitOrderStatus(order: { _id: { toString(): string } }) {
    this.server
      .to(`order:${order._id.toString()}`)
      .emit('orderStatusUpdated', order);
  }

  emitRiderAssignment(order: { _id: { toString(): string } }) {
    this.server
      .to(`order:${order._id.toString()}`)
      .emit('orderRiderAssigned', order);
  }
}
