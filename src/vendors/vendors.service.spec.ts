import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VendorsService } from './vendors.service';
import { Order } from 'src/schemas/Order.schema';
import { Restaurant } from 'src/schemas/Restaurant.schema';
import { Vendor } from 'src/schemas/Vendor.schema';

describe('VendorsService', () => {
  let service: VendorsService;
  let mockVendorModel: any;
  let mockOrderModel: any;

  const mockVendor = {
    _id: 'vendor123',
    userId: 'user123',
    businessName: 'Test Restaurant',
    description: 'Test description',
    location: { type: 'Point', coordinates: [0, 0] },
    openHours: '09:00',
    closeHours: '22:00',
    avgRating: 4.5,
    isVerified: false,
    isDeleted: false,
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    mockVendorModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockVendor]),
            }),
          }),
        }),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVendor),
      }),
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn().mockResolvedValue(mockVendor),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVendor),
      }),
    };

    mockOrderModel = {
      find: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    };

    const mockRestaurantModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        {
          provide: getModelToken(Vendor.name),
          useValue: mockVendorModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken(Restaurant.name), // or 'RestaurantModel' / 'Restaurant' depending on your injection token
          useValue: mockRestaurantModel,
        },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listAll', () => {
    it('should return paginated vendors', async () => {
      const result = await service.listAll(0, 10);
      expect(result).toHaveLength(1);
      expect(mockVendorModel.find).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a vendor by id', async () => {
      const result = await service.findById('507f1f77bcf86cd799439011');
      expect(result).toMatchObject({
        id: 'vendor123',
        businessName: 'Test Restaurant',
        description: 'Test description',
        isVerified: false,
      });
    });
  });

  describe('createVendor', () => {
    it('should create a new vendor', async () => {
      const dto = {
        businessName: 'New Restaurant',
        description: 'A new place',
        openHours: '09:00',
        closeHours: '22:00',
      };
      await service.createVendor('user123', dto);
      expect(mockVendorModel.create).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update vendor profile', async () => {
      // Ensure vendor exists for updateProfile
      mockVendorModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockVendor),
      });
      await service.updateProfile('user123', {
        businessName: 'Updated',
      });
      expect(mockVendorModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });
});
