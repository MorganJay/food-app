import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiProperty, 
  ApiBody 
} from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { UserRole } from 'src/schemas/User.schema';
import { JwtAuthGuard } from 'src/auth/auth-guards';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class CreateBankDto {
  @ApiProperty({ example: 'Zenith Bank', description: 'The official name of the financial institution' })
  name: string;

  @ApiProperty({ example: '057', description: 'The unique Paystack-compliant routing settlement code' })
  code: string;
}

class UpdateBankDto {
  @ApiProperty({ example: 'Zenith Bank PLC', required: false })
  name?: string;

  @ApiProperty({ example: '057', required: false })
  code?: string;
}

class BankResponseDto {
  @ApiProperty({ example: '6a37bf1eead69ce24e94ac1b' })
  id: string;

  @ApiProperty({ example: 'Zenith Bank' })
  name: string;

  @ApiProperty({ example: '057' })
  code: string;

  @ApiProperty({ example: 1 })
  serialNumber: number;

  @ApiProperty({ example: '2026-06-24T11:24:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-06-24T11:24:00.000Z' })
  updatedAt: string;
}

@ApiTags('Banks')
@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Fetch all supported banks', 
    description: 'Returns a sorted list of all banks and their Paystack routing codes. Publicly accessible for frontend dropdown select elements.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Bank list successfully retrieved.',
    type: [BankResponseDto] 
  })
  async getAllBanks() {
    return this.banksService.findAll();
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiOperation({ 
    summary: 'Sync bank directory with Paystack (Admin Only)', 
    description: 'Fetches the live list of banks from Paystack and adds any missing entries to the database.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Bank directory successfully synced.',
    schema: {
      example: {
        status: 'success',
        processed: 142,
        added: 5,
        message: 'Bank directory synced successfully with Paystack'
      }
    }
  })
  async syncWithPaystack() {
    return this.banksService.syncWithPaystack();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Add a new bank (Admin Only)', description: 'Creates a new supported bank entry. Requires admin privileges.' })
  @ApiBody({ type: CreateBankDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bank entry successfully added.', type: BankResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'A bank with this name or code already exists.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid authentication token.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not possess administrative privileges.' })
  async createBank(@Body() body: CreateBankDto) {
    return this.banksService.create(body.name, body.code);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Modify an existing bank (Admin Only)', description: 'Updates details of a bank record by its MongoDB ObjectId.' })
  @ApiBody({ type: UpdateBankDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bank details successfully updated.', type: BankResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Requested bank record could not be found.' })
  async updateBank(
    @Param('id') id: string,
    @Body() body: UpdateBankDto,
  ) {
    return this.banksService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Soft-delete a bank (Admin Only)', description: 'Flags a bank record as deleted so it no longer appears in public lists.' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Bank successfully deactivated.',
    schema: { example: { message: 'Bank successfully deactivated' } }
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Requested bank record could not be found.' })
  async deleteBank(@Param('id') id: string) {
    return this.banksService.remove(id);
  }
}