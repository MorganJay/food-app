import { Injectable } from '@nestjs/common';

export interface OrderEventPayload {
  type: string;
  orderId: string;
  [key: string]: any;
}

@Injectable()
export class OrderEventsService {
  private readonly handlers: Array<
    (event: OrderEventPayload) => Promise<void> | void
  > = [];

  subscribe(handler: (event: OrderEventPayload) => Promise<void> | void) {
    this.handlers.push(handler);
  }

  async publish(event: OrderEventPayload) {
    await Promise.all(this.handlers.map((handler) => handler(event)));
  }
}
