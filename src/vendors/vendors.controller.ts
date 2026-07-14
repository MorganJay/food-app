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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { VendorsService } from './vendors.service';
import { UpdateVendorDto } from './dto/create-vendor.dto';
import { NinVerificationDto, VerifyNinDto } from './dto/nin-verification-vendor.dto';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

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
    return this.vendorsService.listAll(parseInt(skip, 10), parseInt(limit, 10), sortBy);
  }

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
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiBody({
    description: 'Submit NIN parameters and pre-uploaded verification image JSON objects containing url and publicId',
    type: NinVerificationDto,
  })
  @ApiOperation({ summary: 'Submit NIN verification data (pure JSON)' })
  async submitNin(
    @Req() req,
    @Body() dto: NinVerificationDto,
  ) {
    return this.vendorsService.submitNin(req.user.sub, dto);
  }

  @Post('verify-nin')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Manually verify vendor NIN (Admin only)' })
  @ApiResponse({ status: 200, description: 'NIN verified successfully' })
  async verifyNin(@Body() dto: VerifyNinDto) {
    return this.vendorsService.verifyNin(dto.vendorId);
  }
}