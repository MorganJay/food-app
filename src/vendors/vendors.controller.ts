import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Request,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/create-vendor.dto';
import { NinVerificationDto, VerifyNinDto } from './dto/nin-verification-vendor.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { SetupStoreDto } from './dto/setup-store.dto';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private vendorsService: VendorsService) { }

  @Get()
  @ApiOperation({ summary: 'List all vendors (paginated)' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Vendors list' })
  async listAll(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'avgRating',
  ) {
    return this.vendorsService.listAll(parseInt(skip), parseInt(limit), sortBy);
  }

  // @Get('nearby')
  // @ApiOperation({ summary: 'Find nearby vendors by location' })
  // @ApiQuery({ name: 'latitude', required: true, type: Number })
  // @ApiQuery({ name: 'longitude', required: true, type: Number })
  // @ApiQuery({ name: 'radius', required: false, type: Number })
  // @ApiResponse({ status: 200, description: 'Nearby vendors' })
  // async findNearby(
  //   @Query('latitude') latitude: string,
  //   @Query('longitude') longitude: string,
  //   @Query('radius') radius: string = '5',
  // ) {
  //   return this.vendorsService.findNearby(
  //     parseFloat(latitude),
  //     parseFloat(longitude),
  //     parseInt(radius),
  //   );
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor details' })
  async findById(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('profile')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor updated' })
  async update(
    @Body() updateData: UpdateVendorDto,
    @Req() req
  ) {
    return this.vendorsService.updateProfile(req.user.sub, updateData);
  }

  @Post('nin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit NIN verification and selfie photo upload' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'ninDocument', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
    ]),
  )
  async submitNin(
    @Req() req,
    @Body() dto: NinVerificationDto,
    @UploadedFiles() files: { ninDocument?: Express.Multer.File[]; selfie?: Express.Multer.File[] },
  ) {
    const ninDocFile = files?.ninDocument?.[0];
    const selfieFile = files?.selfie?.[0];

    return this.vendorsService.submitNin(
      req.user.sub,
      dto.nin,
      ninDocFile,
      selfieFile,
    );
  }

  @Post('verify-nin')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Manually verify vendor NIN (Admin only)' })
  @ApiResponse({ status: 200, description: 'NIN verified successfully' })
  async verifyNin(@Body() dto: VerifyNinDto) {
    return this.vendorsService.verifyNin(dto.vendorId);
  };
}
