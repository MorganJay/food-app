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
    console.log(`[EVENT FIRED]: "${event.type}" | Order ID: ${event.orderId}`);

    await Promise.all(
      this.handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          const err = error as Error;
          console.error(`Error running event handler for "${event.type}": ${err.message}`);
        }
      }),
    );
  }
}