import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DeliveryAddressesService } from './delivery-addresses.service';
import { DeliveryAddress } from '../schemas/DeliveryAddress.schema';

describe('DeliveryAddressesService', () => {
  let service: DeliveryAddressesService;
  const chainedExec = () => ({ exec: jest.fn() });
  const addressModel: any = jest.fn().mockImplementation((doc) => ({
    save: jest.fn().mockResolvedValue({ _id: 'addr1', ...doc }),
  }));
  addressModel.countDocuments = jest.fn().mockReturnValue(chainedExec());
  addressModel.updateMany = jest.fn().mockReturnValue(chainedExec());
  addressModel.find = jest
    .fn()
    .mockReturnValue({ sort: jest.fn().mockReturnValue(chainedExec()) });
  addressModel.findOne = jest.fn().mockReturnValue(chainedExec());
  addressModel.findOneAndUpdate = jest.fn().mockReturnValue(chainedExec());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryAddressesService,
        {
          provide: getModelToken(DeliveryAddress.name),
          useValue: addressModel,
        },
      ],
    }).compile();

    service = module.get<DeliveryAddressesService>(DeliveryAddressesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a delivery address and clears other defaults when isDefault is true', async () => {
    addressModel.countDocuments.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(0),
    });
    addressModel.updateMany.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({}),
    });

    const result = await service.create('consumer1', {
      label: 'Home',
      addressLine: '123 Ring Road',
      isDefault: true,
    });

    expect(addressModel.updateMany).toHaveBeenCalledWith(
      { consumerId: 'consumer1' },
      { isDefault: false },
    );
    expect(addressModel).toHaveBeenCalledWith({
      consumerId: 'consumer1',
      label: 'Home',
      addressLine: '123 Ring Road',
      isDefault: true,
    });
    expect(result).toMatchObject({
      consumerId: 'consumer1',
      label: 'Home',
      addressLine: '123 Ring Road',
      isDefault: true,
    });
    expect(result.id).toBe('addr1');
  });

  it('lists consumer delivery addresses', async () => {
    const addresses = [
      { _id: 'addr1', consumerId: 'consumer1', label: 'Home' },
    ];
    addressModel.find.mockReturnValueOnce({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(addresses),
      }),
    });

    const result = await service.findByConsumer('consumer1');

    expect(addressModel.find).toHaveBeenCalledWith({
      consumerId: 'consumer1',
      isDeleted: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ consumerId: 'consumer1', label: 'Home' });
  });
});
