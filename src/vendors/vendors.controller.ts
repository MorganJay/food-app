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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { VendorsService } from './vendors.service';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

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

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby vendors by location' })
  @ApiQuery({ name: 'latitude', required: true, type: Number })
  @ApiQuery({ name: 'longitude', required: true, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Nearby vendors' })
  async findNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius: string = '5',
  ) {
    return this.vendorsService.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor details' })
  async findById(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create vendor profile' })
  @ApiResponse({ status: 201, description: 'Vendor created' })
  async create(@Body() vendorData: any, @Req() req) {
    return this.vendorsService.createVendor(req.user.sub, vendorData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor updated' })
  async update(@Param('id') id: string, @Body() updateData: any, @Req() req) {
    return this.vendorsService.updateProfile(id, req.user.sub, updateData);
  }
}
