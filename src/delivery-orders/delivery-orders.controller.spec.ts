import { DeliveryOrdersController } from './delivery-orders.controller';
import { DeliveryOrdersService } from './delivery-orders.service';
import { DbglService } from '../dbgl/dbgl.service';

describe('DeliveryOrdersController', () => {
  const payload = {
    event: 'order.delivered',
    order_id: 'ORD-123',
    status: 'delivered',
  };
  let controller: DeliveryOrdersController;
  let deliveryOrdersService: Pick<
    DeliveryOrdersService,
    'findAll' | 'findById'
  >;
  let dbglService: Pick<DbglService, 'quote' | 'createOrder' | 'handleWebhook'>;

  beforeEach(() => {
    deliveryOrdersService = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(payload),
    };
    dbglService = {
      quote: jest.fn().mockResolvedValue(payload),
      createOrder: jest.fn().mockResolvedValue(payload),
      handleWebhook: jest.fn().mockResolvedValue(payload),
    };
    controller = new DeliveryOrdersController(
      deliveryOrdersService as DeliveryOrdersService,
      dbglService as DbglService,
    );
  });

  it('delegates webhook handling to the DBGL adapter', async () => {
    const request = {
      rawBody: Buffer.from(JSON.stringify(payload)),
      headers: { 'x-webhook-signature': 'signature' },
    };

    await expect(controller.webhook(payload, request)).resolves.toEqual({
      ok: true,
    });
    expect(dbglService.handleWebhook).toHaveBeenCalledWith(
      payload,
      'signature',
      request.rawBody,
    );
  });
});
