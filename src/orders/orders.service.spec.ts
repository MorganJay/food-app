import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from '../schemas/Order.schema';
import { Cart } from '../schemas/Cart.schema';
import { Vendor } from '../schemas/Vendor.schema';
import { Rider } from '../schemas/Rider.schema';
import { DeliveryAddress } from '../schemas/DeliveryAddress.schema';
import { Restaurant } from '../schemas/Restaurant.schema';
import { User, UserRole } from '../schemas/User.schema';
import { OrderEventsService } from './order-events.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

describe('OrdersService', () => {
  let service: OrdersService;
  const orderSave = jest.fn();
  const orderModelMock: any = jest
    .fn()
    .mockImplementation(() => ({ save: orderSave }));
  orderModelMock.findOne = jest.fn();
  orderModelMock.findOneAndUpdate = jest.fn();
  const cartModel = {
    findOne: jest.fn(() => chainedExec()),
    findOneAndUpdate: jest.fn(() => chainedExec()),
  };
  const vendorModel = { findOne: jest.fn(() => chainedExec()) };
  const riderModel = { findOne: jest.fn(() => chainedExec()) };
  const restaurantModel = {
    findById: jest.fn(() => chainedExec()),
    findOne: jest.fn(() => chainedExec()),
  };
  const userModel = { findOne: jest.fn(() => chainedExec()) };
  const chainedExec = () => ({ exec: jest.fn() });
  const addressModel = {
    countDocuments: jest.fn().mockReturnValue(chainedExec()),
    create: jest.fn(),
  };
  const orderEventsService = { publish: jest.fn() };
  const notificationsService = { sendEmail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModelMock },
        { provide: getModelToken(Cart.name), useValue: cartModel },
        { provide: getModelToken(Vendor.name), useValue: vendorModel },
        { provide: getModelToken(Rider.name), useValue: riderModel },
        { provide: getModelToken(Restaurant.name), useValue: restaurantModel },
        {
          provide: getModelToken(DeliveryAddress.name),
          useValue: addressModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: OrderEventsService, useValue: orderEventsService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
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
    userModel.findOne.mockReturnValueOnce({
      exec: jest
        .fn()
        .mockResolvedValue({
          _id: 'consumer1',
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+2348012345678',
        }),
    });
    cartModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ items: [] }),
    });
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
      restaurantId: 'restaurant1',
      items: [{ productId: 'prod1', quantity: 1, price: 100, name: 'Test' }],
      deliveryAddress: { label: 'Home', addressLine: '123 Ring Road' },
    } as any);

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

  it('allows a vendor to accept a pending order', async () => {
    orderModelMock.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({
        _id: 'order1',
        status: OrderStatus.PENDING,
        restaurantId: 'restaurant1',
        user: {
          userId: 'consumer1',
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+2348012345678',
        },
        items: [],
        subtotal: 1000,
        serviceFee: 100,
        deliveryFee: 400,
        total: 1500,
        deliveryAddress: {},
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    });
    orderModelMock.findOneAndUpdate.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({
        _id: 'order1',
        status: OrderStatus.ACCEPTED,
        restaurantId: 'restaurant1',
        user: {
          userId: 'consumer1',
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+2348012345678',
        },
        items: [],
        subtotal: 1000,
        serviceFee: 100,
        deliveryFee: 400,
        total: 1500,
        deliveryAddress: {},
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    });
    vendorModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ _id: 'vendor1' }),
    });
    restaurantModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ _id: 'restaurant1' }),
    });
    orderModelMock.findOneAndUpdate.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({
        _id: 'order1',
        status: OrderStatus.ACCEPTED,
        restaurantId: 'restaurant1',
        user: {
          userId: 'consumer1',
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+2348012345678',
        },
        items: [],
        subtotal: 1000,
        serviceFee: 100,
        deliveryFee: 400,
        total: 1500,
        deliveryAddress: {},
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    });
    const result = await service.acceptOrder('order1', {
      sub: 'vendor1',
      role: UserRole.VENDOR,
    });

    expect(result.status).toBe(OrderStatus.ACCEPTED);
    expect(orderEventsService.publish).toHaveBeenCalled();
  });

  it('rejects invalid transitions', async () => {
    orderModelMock.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({
        _id: 'order1',
        status: OrderStatus.PENDING,
        restaurantId: 'restaurant1',
        user: {
          userId: 'consumer1',
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+2348012345678',
        },
      }),
    });
    vendorModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ _id: 'vendor1' }),
    });
    restaurantModel.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ _id: 'restaurant1' }),
    });

    await expect(
      service.updateStatus('order1', OrderStatus.DELIVERED as any, {
        sub: 'vendor1',
        role: UserRole.VENDOR,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
