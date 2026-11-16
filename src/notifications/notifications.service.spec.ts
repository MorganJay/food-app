import { ConfigService } from '@nestjs/config';
import { InfobipProvider } from '../auth/sms/infobip.provider';
import { NotificationsService } from './notifications.service';

describe('NotificationsService SMS', () => {
  let service: NotificationsService;
  let sendSms: jest.SpyInstance;

  beforeEach(() => {
    service = new NotificationsService({
      get: jest.fn(() => 'configured'),
    } as unknown as ConfigService);
    sendSms = jest.spyOn(InfobipProvider.prototype, 'sendSms');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes valid phone numbers before calling Infobip', async () => {
    sendSms.mockResolvedValue({ success: true, messageId: 'message-1' });

    await service.sendSms({
      to: ' +234 (801) 234-5678 ',
      message: 'Order ORD-1 was accepted.',
      eventType: 'OrderAcceptedEvent',
      recipientId: 'consumer-1',
    });

    expect(sendSms).toHaveBeenCalledWith(
      '+2348012345678',
      'Order ORD-1 was accepted.',
    );
  });

  it('skips invalid phone numbers without calling Infobip', async () => {
    const result = await service.sendSms({
      to: '0801234',
      message: 'Order ORD-1 was accepted.',
      eventType: 'OrderAcceptedEvent',
      recipientId: 'consumer-1',
    });

    expect(result).toEqual({
      success: false,
      reason: 'Invalid phone number',
    });
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('reports Infobip failures to the caller for contextual handling', async () => {
    sendSms.mockRejectedValue(new Error('Infobip unavailable'));

    await expect(
      service.sendSms({
        to: '+2348012345678',
        message: 'Order ORD-1 was accepted.',
        eventType: 'OrderAcceptedEvent',
        recipientId: 'consumer-1',
      }),
    ).rejects.toThrow('Infobip unavailable');
  });
});
