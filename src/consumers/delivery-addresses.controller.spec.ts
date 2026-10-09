import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryAddressesController } from './delivery-addresses.controller';
import { DeliveryAddressesService } from './delivery-addresses.service';

describe('DeliveryAddressesController', () => {
  let controller: DeliveryAddressesController;
  const service = {
    findByConsumer: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryAddressesController],
      providers: [{ provide: DeliveryAddressesService, useValue: service }],
    }).compile();

    controller = module.get<DeliveryAddressesController>(
      DeliveryAddressesController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists addresses for the authenticated consumer', async () => {
    service.findByConsumer.mockResolvedValue(['address1']);

    const result = await controller.list({ user: { sub: 'consumer1' } });

    expect(service.findByConsumer).toHaveBeenCalledWith('consumer1');
    expect(result).toEqual(['address1']);
  });

  it('creates a delivery address for the authenticated consumer', async () => {
    const dto = { label: 'Home', addressLine: '123 Road' };
    service.create.mockResolvedValue({ id: 'addr1', ...dto });

    const result = await controller.create(dto, { user: { sub: 'consumer1' } });

    expect(service.create).toHaveBeenCalledWith('consumer1', dto);
    expect(result).toEqual({ id: 'addr1', ...dto });
  });
});
