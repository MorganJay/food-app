import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

jest.mock('src/common/utils/cloudinary.util', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn(),
}));

import { RestaurantsService } from './restaurants.service';
import { Restaurant } from '../schemas/Restaurant.schema';
import { Category } from '../schemas/Category.schema';
import { Vendor } from '../schemas/Vendor.schema';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let restaurantModel: { create: jest.Mock; find: jest.Mock };
  let vendorModel: { findOne: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    restaurantModel = {
      create: jest.fn(),
      find: jest.fn(),
    };

    vendorModel = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: getModelToken(Restaurant.name),
          useValue: restaurantModel,
        },
        {
          provide: getModelToken(Category.name),
          useValue: {
            findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
          },
        },
        {
          provide: getModelToken(Vendor.name),
          useValue: vendorModel,
        },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
  });

  it('should reject creation when no image or imageUrl is provided', async () => {
    // ensure vendor exists so the service can reach the image validation branch
    vendorModel.findOne.mockResolvedValue({ id: 'vendor-1', _id: 'vendor-1' });
    await expect(
      service.create(
        {
          location: { address: 'Lagos', latitude: 6.5, longitude: 3.4 },
        } as any,
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should use imageUrl when provided for restaurant creation', async () => {
    vendorModel.findOne.mockResolvedValue({ id: 'vendor-1', _id: 'vendor-1' });
    restaurantModel.create.mockResolvedValue({
      _id: 'restaurant-1',
      name: 'Test Restaurant',
      description: 'A test restaurant',
      vendorId: 'vendor-1',
      isActive: true,
      openHours: '08:00',
      closeHours: '22:00',
      workingDays: ['Monday'],
      orderType: 'same day delivery',
      categories: [],
      bannerImage: {
        secure_url: 'https://example.com/banner.jpg',
        public_id: 'banner',
      },
      address: 'Lagos',
      location: { coordinates: [3.4, 6.5] },
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      serialNumber: 1,
    });

    const result = await service.create(
      {
        name: 'Test Restaurant',
        description: 'A test restaurant',
        location: { address: 'Lagos', latitude: 6.5, longitude: 3.4 },
        imageUrl: 'https://example.com/banner.jpg',
      } as any,
      'user-1',
    );

    // response bannerImage is an object with url/publicId
    expect(result.bannerImage).toMatchObject({
      url: 'https://example.com/banner.jpg',
    });
    expect(restaurantModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        bannerImage: {
          secure_url: 'https://example.com/banner.jpg',
          public_id: 'https://example.com/banner.jpg',
        },
      }),
    );
  });

  it('should only list restaurants owned by verified vendors', async () => {
    vendorModel.find.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue([{ _id: 'vendor-1', isVerified: true }]),
    });
    const restaurantQuery = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'restaurant-1',
          name: 'Verified Restaurant',
          description: 'Visible to customers',
          vendorId: 'vendor-1',
          isActive: true,
          openHours: '08:00',
          closeHours: '22:00',
          workingDays: ['Monday'],
          orderType: 'delivery',
          categories: ['African'],
          bannerImage: {
            secure_url: 'https://example.com/banner.jpg',
            public_id: 'banner',
          },
          address: 'Lagos',
          location: { coordinates: [3.4, 6.5] },
          rating: 4.5,
          reviewCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          serialNumber: 1,
        },
      ]),
    };
    restaurantModel.find.mockReturnValue(restaurantQuery);

    const result = await service.findAll(0, 10);

    expect(vendorModel.find).toHaveBeenCalledWith(
      { isVerified: true },
      { _id: 1 },
    );
    expect(restaurantModel.find).toHaveBeenCalledWith({
      isActive: true,
      vendorId: { $in: ['vendor-1'] },
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Verified Restaurant');
  });

  it('should exclude unverified vendors from customer search results', async () => {
    vendorModel.find.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue([{ _id: 'vendor-1', isVerified: true }]),
    });
    const searchQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    restaurantModel.find.mockReturnValue(searchQuery);

    const result = await service.search('amala', 0, 10);

    expect(restaurantModel.find).toHaveBeenCalledWith(
      {
        $text: { $search: 'amala' },
        isActive: true,
        vendorId: { $in: ['vendor-1'] },
      },
      { score: { $meta: 'textScore' } },
    );
    expect(result).toEqual([]);
  });
});
