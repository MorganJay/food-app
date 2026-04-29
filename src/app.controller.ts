import { Controller, Get, Query } from '@nestjs/common';
import mongoose from 'mongoose';

import { AppService } from './app.service';
import { ApiQuery } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      console.log('❌ MongoDB error:', err);
    });
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
