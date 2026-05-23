import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DeliveryAddressesController } from '../src/consumers/delivery-addresses.controller';
import { OrdersController } from '../src/orders/orders.controller';
import { DeliveryAddressesService } from '../src/consumers/delivery-addresses.service';
import { OrdersService } from '../src/orders/orders.service';
import { OrdersGateway } from '../src/orders/orders.gateway';
import { JwtAuthGuard as AuthGuardType1 } from '../src/auth/auth-guards';
import { JwtAuthGuard as AuthGuardType2 } from '../src/auth/strategies/jwt.strategy';
import { RolesGuard } from '../src/auth/roles.guard';
import { UserRole } from '../src/schemas/User.schema';

describe('Consumer Delivery Addresses API (e2e)', () => {
  let app: INestApplication;
  const addressService = {
    findByConsumer: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const ordersService = {
    create: jest.fn(),
    findByUser: jest.fn(),
  };
  const ordersGateway = {
    emitOrderStatus: jest.fn(),
    emitRiderAssignment: jest.fn(),
  };
  const mockJwtGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { sub: 'consumer-test', role: UserRole.CONSUMER };
      return true;
    },
  };
  const mockRolesGuard = { canActivate: () => true };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryAddressesController, OrdersController],
      providers: [
        { provide: DeliveryAddressesService, useValue: addressService },
        { provide: OrdersService, useValue: ordersService },
        { provide: OrdersGateway, useValue: ordersGateway },
      ],
    })
      .overrideGuard(AuthGuardType1)
      .useValue(mockJwtGuard)
      .overrideGuard(AuthGuardType2)
      .useValue(mockJwtGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a delivery address via POST /consumers/addresses', async () => {
    const payload = {
      label: 'Home',
      addressLine: '123 Ring Road, Ibadan',
      city: 'Ibadan',
      state: 'Oyo',
      postalCode: '200001',
      country: 'NG',
      location: { lat: 7.3775, lng: 3.9470 },
      instructions: 'Leave at gate',
      isDefault: true,
    };
    addressService.create.mockResolvedValue({ id: 'addr1', ...payload });

    const response = await request(app.getHttpServer())
      .post('/consumers/addresses')
      .send(payload)
      .expect(201);

    expect(addressService.create).toHaveBeenCalledWith('consumer-test', payload);
    expect(response.body).toMatchObject({ id: 'addr1', ...payload });
  });

  it('lists delivery addresses via GET /consumers/addresses', async () => {
    const payload = [{ id: 'addr1', label: 'Home' }];
    addressService.findByConsumer.mockResolvedValue(payload);

    const response = await request(app.getHttpServer())
      .get('/consumers/addresses')
      .expect(200);

    expect(addressService.findByConsumer).toHaveBeenCalledWith('consumer-test');
    expect(response.body).toEqual(payload);
  });

  it('updates a delivery address via PUT /consumers/addresses/:id', async () => {
    const payload = { instructions: 'Leave at back gate' };
    addressService.update.mockResolvedValue({ id: 'addr1', ...payload });

    const response = await request(app.getHttpServer())
      .put('/consumers/addresses/addr1')
      .send(payload)
      .expect(200);

    expect(addressService.update).toHaveBeenCalledWith('addr1', 'consumer-test', payload);
    expect(response.body).toEqual({ id: 'addr1', ...payload });
  });

  it('deletes a delivery address via DELETE /consumers/addresses/:id', async () => {
    addressService.remove.mockResolvedValue({ id: 'addr1', isDeleted: true });

    const response = await request(app.getHttpServer())
      .delete('/consumers/addresses/addr1')
      .expect(200);

    expect(addressService.remove).toHaveBeenCalledWith('addr1', 'consumer-test');
    expect(response.body).toEqual({ id: 'addr1', isDeleted: true });
  });

  it('creates an order via POST /orders', async () => {
    const orderPayload = {
      vendorId: 'vendor1',
      items: [{ productId: 'prod1', quantity: 1, price: 1200, name: 'Burger' }],
      total: 1200,
      deliveryAddress: { label: 'Home', addressLine: '123 Ring Road, Ibadan' },
    };
    ordersService.create.mockResolvedValue({
      id: 'order1',
      userId: 'consumer-test',
      ...orderPayload,
      status: 'pending',
    });

    const response = await request(app.getHttpServer())
      .post('/orders')
      .send(orderPayload)
      .expect(201);

    expect(ordersService.create).toHaveBeenCalledWith('consumer-test', orderPayload);
    expect(response.body).toMatchObject({ id: 'order1', userId: 'consumer-test', total: 1200 });
  });
});
