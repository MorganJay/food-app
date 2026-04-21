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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('food/:foodId')
  @ApiOperation({ summary: 'Get reviews by food' })
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
  @Get('me')
  @Roles(UserRole.CONSUMER)
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
  @Post()
  @Roles(UserRole.CONSUMER)
  async create(@Body() reviewData: any, @Req() req) {
    return this.reviewsService.create(req.user.sub, reviewData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(UserRole.CONSUMER)
  async update(@Param('id') id: string, @Body() updateData: any, @Req() req) {
    return this.reviewsService.update(id, req.user.sub, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles(UserRole.CONSUMER, UserRole.ADMIN)
  async delete(@Param('id') id: string, @Req() req) {
    return this.reviewsService.delete(id, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/report')
  @Roles(UserRole.VENDOR)
  async report(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req,
  ) {
    return this.reviewsService.report(id, req.user.sub, body.reason);
  }
}
