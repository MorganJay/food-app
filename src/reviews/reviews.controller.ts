import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/reviews.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('food/:foodId')
  @ApiOperation({ summary: 'Get reviews for a food item' })
  @ApiParam({
    name: 'foodId',
    example: 'food_12345',
  })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Food reviews' })
  async findByFood(
    @Param('foodId') foodId: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.reviewsService.findByFood(
      foodId,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get reviews for a vendor' })
  @ApiParam({
    name: 'vendorId',
    example: 'vendor_67890',
  })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findByVendor(
    @Param('vendorId') vendorId: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.reviewsService.findByVendor(
      vendorId,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @Get('me')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Get my reviews' })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findByConsumer(
    @Req() req,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    return this.reviewsService.findByConsumer(
      req.user.sub,
      parseInt(skip),
      parseInt(limit),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @Post()
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Create a review' })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  async create(@Body() reviewData: CreateReviewDto, @Req() req) {
    return this.reviewsService.create(req.user.sub, reviewData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @Patch(':id')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Update a review' })
  @ApiParam({
    name: 'id',
    example: 'review_12345',
  })
  async update(@Param('id') id: string, @Body() updateData: UpdateReviewDto, @Req() req) {
    return this.reviewsService.update(id, req.user.sub, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @Delete(':id')
  @Roles(UserRole.CONSUMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({
    name: 'id',
    example: 'review_12345',
  })
  async delete(@Param('id') id: string, @Req() req) {
    return this.reviewsService.delete(id, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @Post(':id/report')
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Report a review' })
  @ApiParam({
    name: 'id',
    example: 'review_12345',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'Spam or inappropriate content',
        },
      },
      required: ['reason'],
    },
  })
  async report(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req,
  ) {
    return this.reviewsService.report(id, req.user.sub, body.reason);
  }
}
