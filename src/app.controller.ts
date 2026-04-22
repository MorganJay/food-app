import { Controller, Get, Query } from '@nestjs/common';

import { AppService } from './app.service';
import { ApiQuery } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/db')
  @ApiQuery({
    name: 'collection',
    required: false,
    description: 'Optional collection name to sample documents from',
    type: String,
  })
  async getDb(@Query('collection') collection?: string) {
    return this.appService.getDb(collection);
  }
}
