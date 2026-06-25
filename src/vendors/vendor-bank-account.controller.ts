import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
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
  VendorBankAccountResponseDto,
} from './dto/create-vendor-bank-account.dto';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../schemas/User.schema';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Vendor Bank Accounts')
@Controller('vendors/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorBankAccountController {
  constructor(
    private readonly accountService: VendorBankAccountService,
  ) {}

  @Post()
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Create vendor bank account payout channel',
    description: 'Adds a new bank account profile for settlements. The bankCode property must be a valid code fetched from the main GET /banks directory endpoint.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bank account added successfully.',
    type: VendorBankAccountResponseDto,
  })
  async create(
    @Req() req,
    @Body() dto: CreateVendorBankAccountDto,
  ) {
    const vendorId = req.user.sub;
    return this.accountService.create(vendorId, dto);
  }

  @Get('all')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Get all saved bank accounts for the logged-in vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor bank accounts retrieved successfully.',
    type: [VendorBankAccountResponseDto],
  })
  async findAll(
    @Req() req,
  ) {
    const vendorId = req.user.sub;
    return this.accountService.findAll(vendorId);
  }

  @Get(':accountId')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Get details of a single specific vendor bank account',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account details successfully fetched.',
    type: VendorBankAccountResponseDto,
  })
  async findOne(
    @Req() req,
    @Param('accountId') accountId: string,
  ) {
    const vendorId = req.user.sub;
    return this.accountService.getOne(vendorId, accountId);
  }

  @Patch(':accountId')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Update saved vendor bank account information fields',
    description: 'Modifies profile routing attributes. Note that providing a updated bankCode will automatically recalculate and reassign the internal bankName property label.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated successfully.',
    type: VendorBankAccountResponseDto,
  })
  async update(
    @Req() req,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateVendorBankAccountDto,
  ) {
    const vendorId = req.user.sub;
    return this.accountService.update(vendorId, accountId, dto);
  }

  @Delete(':accountId')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Soft-delete a vendor bank account record from the system profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated and flagged as deleted successfully.',
    schema: { example: { message: 'Account deleted successfully' } },
  })
  async remove(
    @Req() req,
    @Param('accountId') accountId: string,
  ) {
    const vendorId = req.user.sub;
    return this.accountService.remove(vendorId, accountId);
  }

  @Patch(':accountId/default')
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Designate a specific bank account as the default payout target',
    description: 'Sets the targeted account target flag to true and switches all other associated accounts to false.',
  })
  @ApiResponse({
    status: 200,
    description: 'Default payout settlement configurations successfully updated.',
    type: VendorBankAccountResponseDto,
  })
  async setDefault(
    @Req() req,
    @Param('accountId') accountId: string,
  ) {
    const vendorId = req.user.sub;
    return this.accountService.setDefault(vendorId, accountId);
  }
}