import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FoodsService } from './foods.service';
import { Food } from '../schemas/Food.schema';

describe('FoodsService', () => {
  let service: FoodsService;
  let mockFoodModel: any;

  const mockFood = {
    _id: 'food123',
    vendorId: 'vendor123',
    name: 'Test Food',
    unit: 'plates',
    price: 500,
    status: 'ACTIVE',
    category: 'Main',
    prepTime: 30,
    avgRating: 4.0,
    reviewsCount: 5,
    isDeleted: false,
  };

  beforeEach(async () => {
    mockFoodModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockFood]),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFood),
      }),
      create: jest.fn().mockResolvedValue(mockFood),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFood),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFood),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodsService,
        {
          provide: getModelToken(Food.name),
          useValue: mockFoodModel,
        },
      ],
    }).compile();

    service = module.get<FoodsService>(FoodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByVendor', () => {
    it('should return foods for a vendor', async () => {
      const result = await service.findByVendor('vendor123');
      expect(result).toHaveLength(1);
      expect(mockFoodModel.find).toHaveBeenCalledWith({
        vendorId: 'vendor123',
      });
    });
  });

  describe('create', () => {
    it('should create a new food', async () => {
      const dto = {
        vendorId: 'vendor123',
        name: 'New Food',
        unit: 'plates',
        price: 300,
      };
      const result = await service.create('vendor123', dto);
      expect(mockFoodModel.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a food', async () => {
      const result = await service.update('food123', 'vendor123', {
        price: 400,
      });
      expect(mockFoodModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete a food', async () => {
      const result = await service.delete('food123', 'vendor123');
      expect(mockFoodModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search foods by name', async () => {
      const result = await service.search('Test');
      expect(mockFoodModel.find).toHaveBeenCalled();
    });
  });
});
