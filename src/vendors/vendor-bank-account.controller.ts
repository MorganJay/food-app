import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { VendorBankAccountService } from './vendor-bank-account.service';
import {
  CreateVendorBankAccountDto,
  UpdateVendorBankAccountDto,
} from './dto/create-vendor-bank-account.dto';
import { JwtAuthGuard } from 'src/auth/auth-guards';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/schemas/User.schema';
import { Roles } from 'src/auth/roles.decorator';


@ApiTags('Vendor Bank Accounts')
@Controller('vendors/accounts')
export class VendorBankAccountController {
  constructor(
    private readonly account: VendorBankAccountService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @Post()
  @ApiOperation({
    summary: 'Create vendor bank account',
  })
  @ApiResponse({
    status: 201,
    description: 'Bank account created successfully',
  })
  async create(
    @Request() req,
    @Body() dto: CreateVendorBankAccountDto,
  ) {
    const vendorId = req.user.sub;
    return this.account.create(vendorId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @Get('all')
  @ApiOperation({
    summary: 'Get all vendor bank accounts',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor bank accounts retrieved successfully',
  })
  async findAll(
    @Request() req,
  ) {
    const vendorId = req.user.sub;
    return this.account.findAll(vendorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @Get(':accountId')
  @ApiOperation({
    summary: 'Get a vendor bank account',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account details',
  })
  async findOne(
    @Request() req,
    @Param('accountId') accountId: string,
  ) {
    const vendorId = req.user.sub;
    return this.account.getOne(vendorId, accountId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @Patch(':accountId')
  @ApiOperation({
    summary: 'Update vendor bank account',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated successfully',
  })
  async update(
    @Request() req,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateVendorBankAccountDto,
  ) {
    const vendorId = req.user.sub;
    return this.account.update(vendorId, accountId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @Delete(':accountId')
  @ApiOperation({
    summary: 'Delete vendor bank account',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account deleted successfully',
  })
  async remove(
    @Request() req,
    @Param('accountId') accountId: string,
  ) {
    const vendorId = req.user.sub;
    return this.account.remove(vendorId, accountId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @Patch(':accountId/default')
  @ApiOperation({
    summary: 'Set bank account as default',
  })
  @ApiResponse({
    status: 200,
    description: 'Default bank account updated successfully',
  })
  async setDefault(
    @Request() req,
    @Param('accountId') accountId: string,
  ) {
    const vendorId = req.user.sub;
    return this.account.setDefault(vendorId, accountId);
  }
}