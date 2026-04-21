import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: 'orders', cors: { origin: '*' } })
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  emitOrderStatus(order: any) {
    this.server.emit('orderStatusUpdated', order);
  }

  emitRiderAssignment(order: any) {
    this.server.emit('orderRiderAssigned', order);
  }
}
