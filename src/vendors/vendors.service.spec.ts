import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VendorsService } from './vendors.service';
import { Vendor } from '../schemas/Vendor.schema';

describe('VendorsService', () => {
  let service: VendorsService;
  let mockVendorModel: any;

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
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockVendor]),
          }),
        }),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVendor),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockResolvedValue(mockVendor),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVendor),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        {
          provide: getModelToken(Vendor.name),
          useValue: mockVendorModel,
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
      const result = await service.findById('vendor123');
      expect(result).toEqual(mockVendor);
    });
  });

  describe('createVendor', () => {
    it('should create a new vendor', async () => {
      const dto = { businessName: 'New Restaurant' };
      const result = await service.createVendor('user123', dto);
      expect(mockVendorModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update vendor profile', async () => {
      const result = await service.updateProfile('vendor123', 'user123', {
        businessName: 'Updated',
      });
      expect(mockVendorModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });
});
