import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from '../schemas/Review.schema';
import { Product, ProductDocument } from '../schemas/Product.schema';
import { Vendor, VendorDocument } from '../schemas/Vendor.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
  ) { }

  async create(consumerId: string, reviewData: any) {
    const review = new this.reviewModel({
      ...reviewData,
      consumerId,
      reports: [],
    });
    const created = await review.save();
    await this.adjustAverages(
      created.vendorId,
      created.productId,
      created.rating,
      1,
    );
    return this.mapReviewResponse(created);
  }

  async findByFood(productId: string, skip: number = 0, limit: number = 20) {
    const reviews = await this.reviewModel
      .find({ productId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return reviews.map((review) => this.mapReviewResponse(review));
  }

  async findByVendor(vendorId: string, skip: number = 0, limit: number = 20) {
    const reviews = await this.reviewModel
      .find({ vendorId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return reviews.map((review) => this.mapReviewResponse(review));
  }

  async findByConsumer(
    consumerId: string,
    skip: number = 0,
    limit: number = 20,
  ) {
    const reviews = await this.reviewModel
      .find({ consumerId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return reviews.map((review) => this.mapReviewResponse(review));
  }

  async update(id: string, consumerId: string, updateData: any) {
    const review = await this.reviewModel.findById(id).exec();
    if (!review || review.isDeleted) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    if (review.consumerId !== consumerId) {
      throw new ForbiddenException('You can only update your own reviews');
    }
    const ageMinutes =
      (Date.now() - new Date((review as any).createdAt).getTime()) / 60000;
    if (ageMinutes > 30) {
      throw new BadRequestException('Review update window has expired');
    }

    const originalRating = review.rating;
    const updated = await this.reviewModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (updateData.rating != null && updated) {
      await this.adjustAverages(
        updated.vendorId,
        updated.productId,
        (updateData.rating as number) - originalRating,
        0,
      );
    }
    return this.mapReviewResponse(updated);
  }

  async delete(id: string, userId: string, userRole: string) {
    const review = await this.reviewModel.findById(id).exec();
    if (!review || review.isDeleted) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    if (userRole !== 'admin') {
      if (review.consumerId !== userId) {
        throw new ForbiddenException('You can only delete your own reviews');
      }
      const ageMinutes =
        (Date.now() - new Date((review as any).createdAt).getTime()) / 60000;
      if (ageMinutes > 30) {
        throw new BadRequestException('Review deletion window has expired');
      }
    }

    await this.reviewModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
    await this.adjustAverages(
      review.vendorId,
      review.productId,
      -review.rating,
      -1,
    );
    return { id, deleted: true };
  }

  async report(id: string, vendorId: string, reason: string) {
    const updated = await this.reviewModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            reports: { vendorId, reason, createdAt: new Date() },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Review not found');
    }
    return this.mapReviewResponse(updated);
  }

  private async adjustAverages(
    vendorId: string,
    productId: string,
    ratingDelta: number,
    countDelta: number,
  ) {
    const product = await this.productModel.findById(productId).exec();
    const vendor = await this.vendorModel.findById(vendorId).exec();
    if (product) {
      const currentCount = product.reviewsCount || 0;
      const currentAvg = product.avgRating || 0;
      const nextCount = currentCount + countDelta;
      const nextAvg =
        nextCount > 0
          ? (currentAvg * currentCount + ratingDelta) / nextCount
          : 0;
      await this.productModel.findByIdAndUpdate(productId, {
        reviewsCount: Math.max(0, nextCount),
        avgRating: nextAvg,
      });
    }
    if (vendor) {
      const currentCount = vendor.reviewsCount || 0;
      const currentAvg = vendor.avgRating || 0;
      const nextCount = currentCount + countDelta;
      const nextAvg =
        nextCount > 0
          ? (currentAvg * currentCount + ratingDelta) / nextCount
          : 0;
      await this.vendorModel.findByIdAndUpdate(vendorId, {
        reviewsCount: Math.max(0, nextCount),
        avgRating: nextAvg,
      });
    }
  }

  private mapReviewResponse(review: ReviewDocument) {
    return {
      id: review._id.toString(),
      serialNumber: review.serialNumber,
      consumerId: review.consumerId,
      vendorId: review.vendorId,
      productId: review.productId,

      rating: review.rating,
      comment: review.comment,

      reports: review.reports.map((r) => ({
        vendorId: r.vendorId,
        reason: r.reason,
        createdAt: r.createdAt,
      })),

      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
