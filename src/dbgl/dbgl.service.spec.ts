import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { DbglService } from './dbgl.service';
import { DeliveryOrdersService } from '../delivery-orders/delivery-orders.service';

describe('DbglService webhook verification', () => {
  const webhookSecret = 'test-dbgl-webhook-secret';
  const payload = {
    event: 'order.delivered',
    order_id: 'ORD-123',
    status: 'delivered',
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  let service: DbglService;
  let deliveryOrdersService: Pick<
    DeliveryOrdersService,
    'upsertFromProvider' | 'findOrdersPendingStatusPolling'
  >;
  let previousSecret: string | undefined;
  let previousPollingFlag: string | undefined;
  let previousNodeEnvironment: string | undefined;

  beforeEach(() => {
    previousSecret = process.env.DBGL_WEBHOOK_SECRET;
    previousPollingFlag = process.env.DBGL_STATUS_POLLING_ENABLED;
    previousNodeEnvironment = process.env.NODE_ENV;
    process.env.DBGL_WEBHOOK_SECRET = webhookSecret;
    deliveryOrdersService = {
      upsertFromProvider: jest.fn().mockResolvedValue(payload),
      findOrdersPendingStatusPolling: jest.fn().mockResolvedValue([]),
    };
    service = new DbglService(deliveryOrdersService as DeliveryOrdersService);
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.DBGL_WEBHOOK_SECRET;
    } else {
      process.env.DBGL_WEBHOOK_SECRET = previousSecret;
    }
    if (previousPollingFlag === undefined) {
      delete process.env.DBGL_STATUS_POLLING_ENABLED;
    } else {
      process.env.DBGL_STATUS_POLLING_ENABLED = previousPollingFlag;
    }
    if (previousNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnvironment;
    }
  });

  it('accepts a valid HMAC signature for the exact raw body', async () => {
    const signature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    await expect(
      service.handleWebhook(payload, signature, rawBody),
    ).resolves.toEqual(payload);
    expect(deliveryOrdersService.upsertFromProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ORD-123',
        provider: 'dbgl',
        endpoint: 'webhook',
      }),
      'webhook_event',
    );
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'not-a-sha256-digest'],
    ['incorrect', 'a'.repeat(64)],
  ])('rejects a %s signature', async (_caseName, signature) => {
    await expect(
      service.handleWebhook(payload, signature, rawBody),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deliveryOrdersService.upsertFromProvider).not.toHaveBeenCalled();
  });

  it('rejects the webhook when the raw body is unavailable', async () => {
    const signature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    await expect(
      service.handleWebhook(payload, signature, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deliveryOrdersService.upsertFromProvider).not.toHaveBeenCalled();
  });

  it('automatically polls pending orders when local polling is enabled', async () => {
    process.env.DBGL_STATUS_POLLING_ENABLED = 'true';
    delete process.env.NODE_ENV;
    (
      deliveryOrdersService.findOrdersPendingStatusPolling as jest.Mock
    ).mockResolvedValue([{ orderId: 'ORD-1' }, { orderId: 'ORD-2' }]);
    const pollStatus = jest
      .spyOn(service, 'fetchStatusByOrderId')
      .mockResolvedValue(payload as any);

    await service.pollPendingOrderStatuses();

    expect(pollStatus).toHaveBeenCalledWith('ORD-1');
    expect(pollStatus).toHaveBeenCalledWith('ORD-2');
  });

  it('does not poll in production even when the flag is enabled', async () => {
    process.env.DBGL_STATUS_POLLING_ENABLED = 'true';
    process.env.NODE_ENV = 'production';

    await service.pollPendingOrderStatuses();

    expect(
      deliveryOrdersService.findOrdersPendingStatusPolling,
    ).not.toHaveBeenCalled();
  });
});
