import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { Order } from '../schemas/Order.schema';
import { Cart } from '../schemas/Cart.schema';
import { Vendor } from '../schemas/Vendor.schema';
import { Rider } from '../schemas/Rider.schema';
import { DeliveryAddress } from '../schemas/DeliveryAddress.schema';

describe('OrdersService', () => {
  let service: OrdersService;
  const orderSave = jest.fn();
  const orderModelMock: any = jest
    .fn()
    .mockImplementation(() => ({ save: orderSave }));
  orderModelMock.findOne = jest.fn();
  orderModelMock.findOneAndUpdate = jest.fn();
  const cartModel = { findOne: jest.fn(), findByIdAndUpdate: jest.fn() };
  const vendorModel = { findOne: jest.fn() };
  const riderModel = { findOne: jest.fn() };
  const chainedExec = () => ({ exec: jest.fn() });
  const addressModel = {
    countDocuments: jest.fn().mockReturnValue(chainedExec()),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModelMock },
        { provide: getModelToken(Cart.name), useValue: cartModel },
        { provide: getModelToken(Vendor.name), useValue: vendorModel },
        { provide: getModelToken(Rider.name), useValue: riderModel },
        {
          provide: getModelToken(DeliveryAddress.name),
          useValue: addressModel,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('saves the first delivery address when object is provided and no addresses exist', async () => {
    const savedOrder = {
      _id: 'order1',
      serialNumber: 1,
      userId: 'consumer1',
      vendorId: 'vendor1',
      items: [{ productId: 'prod1', quantity: 1, price: 100, name: 'Test' }],
      total: 100,
      deliveryAddress: { label: 'Home', addressLine: '123 Ring Road' },
      status: 'pending',
      notes: null,
      riderId: null,
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    orderSave.mockResolvedValue(savedOrder);
    addressModel.countDocuments.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(0),
    });
    addressModel.create.mockResolvedValue({
      consumerId: 'consumer1',
      label: 'Home',
      addressLine: '123 Ring Road',
      isDefault: true,
    });

    const result = await service.create('consumer1', {
      vendorId: 'vendor1',
      items: [{ productId: 'prod1', quantity: 1, price: 100, name: 'Test' }],
      total: 100,
      deliveryAddress: { label: 'Home', addressLine: '123 Ring Road' },
    });

    expect(addressModel.countDocuments).toHaveBeenCalledWith({
      consumerId: 'consumer1',
      isDeleted: false,
    });
    expect(addressModel.create).toHaveBeenCalledWith({
      consumerId: 'consumer1',
      label: 'Home',
      addressLine: '123 Ring Road',
      city: undefined,
      state: undefined,
      postalCode: undefined,
      country: undefined,
      location: undefined,
      instructions: undefined,
      isDefault: true,
    });
    expect(result.deliveryAddress).toEqual({
      label: 'Home',
      addressLine: '123 Ring Road',
    });
  });
});
