import { Model, Schema } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Counter, CounterDocument } from '../schemas/Counter.schema';

@Injectable()
export class AutoIncrementService {
  constructor(
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) {}

  async getNextSequence(name: string): Promise<number> {
    const counter = await this.counterModel.findOneAndUpdate(
      { name },
      { $inc: { value: 1 } },
      { upsert: true, new: true },
    );
    return counter.value;
  }

  attachAutoIncrement(
    schema: Schema,
    fieldName: string,
    collectionName: string,
  ) {
    schema.pre('save', async function (next) {
      if (this.isNew && !this[fieldName]) {
        try {
          const counter = await this.collection.conn.db
            .collection('counters')
            .findOneAndUpdate(
              { name: collectionName },
              { $inc: { value: 1 } },
              { upsert: true, returnDocument: 'after' },
            );
          this[fieldName] = counter.value?.value || 1;
        } catch (error) {
          console.error(`Error auto-incrementing ${fieldName}:`, error);
        }
      }
      next();
    });
  }
}
