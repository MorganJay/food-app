import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { DeliveryAddressesService } from './delivery-addresses.service';
import {
  CreateDeliveryAddressDto,
  UpdateDeliveryAddressDto,
  DeliveryAddressResponseDto,
} from './dto/delivery-address.dto';
import { JwtAuthGuard } from '../auth/auth-guards';

@ApiTags('consumer-addresses')
@ApiBearerAuth('jwt')
@Controller('consumers/addresses')
export class DeliveryAddressesController {
  constructor(private svc: DeliveryAddressesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List consumer delivery addresses' })
  @ApiResponse({ status: 200, type: [DeliveryAddressResponseDto] })
  async list(@Request() req) {
    const consumerId = req.user.sub;
    return this.svc.findByConsumer(consumerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get an address by id' })
  @ApiResponse({ status: 200, type: DeliveryAddressResponseDto })
  async get(@Param('id') id: string, @Request() req) {
    const consumerId = req.user.sub;
    return this.svc.findById(id, consumerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a delivery address' })
  @ApiResponse({ status: 201, type: DeliveryAddressResponseDto })
  async create(@Body() dto: CreateDeliveryAddressDto, @Request() req) {
    const consumerId = req.user.sub;
    return this.svc.create(consumerId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Update a delivery address' })
  @ApiResponse({ status: 200, type: DeliveryAddressResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryAddressDto,
    @Request() req,
  ) {
    const consumerId = req.user.sub;
    return this.svc.update(id, consumerId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a delivery address' })
  @ApiResponse({ status: 200, type: DeliveryAddressResponseDto })
  async remove(@Param('id') id: string, @Request() req) {
    const consumerId = req.user.sub;
    return this.svc.remove(id, consumerId);
  }
}
