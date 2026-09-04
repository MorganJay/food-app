import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseEntity } from './BaseEntity';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category extends BaseEntity {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.model('Category').db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'categories' },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      this.serialNumber = counter ? counter.value : 1;
    } catch (error) {
      console.error('Error auto-incrementing serialNumber for Category:', error);
    }
  }
  next();
});