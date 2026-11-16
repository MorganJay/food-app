import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false })
class SelectionOption {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, default: 0 })
  price: number;
}

const SelectionOptionSchema = SchemaFactory.createForClass(SelectionOption);

@Schema({ _id: false })
class ChoiceGroup {
  @Prop({ required: true, trim: true })
  groupName: string;

  @Prop({ required: true, default: false })
  isRequired: boolean;

  @Prop({ type: [SelectionOptionSchema], default: [] })
  options: SelectionOption[];
}

const ChoiceGroupSchema = SchemaFactory.createForClass(ChoiceGroup);

@Schema({ timestamps: true })
export class Product extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  category: string;

  @Prop({
    type: {
      secure_url: { type: String },
      public_id: { type: String },
    },
  })
  image: {
    secure_url: string;
    public_id: string;
  };

  @Prop({ default: 0 })
  prepTime: number;

  @Prop({ default: 0 })
  avgRating: number;

  @Prop({ default: 0 })
  reviewsCount: number;

  @Prop({ required: true })
  restaurantId: string;

  @Prop({ default: true })
  isAvailable: boolean;

  // added the Buyer Choices subdocument array here
  @Prop({ type: [ChoiceGroupSchema], default: [] })
  choiceGroups: ChoiceGroup[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const counter = await this.collection.conn.db
        .collection('counters')
        .findOneAndUpdate(
          { name: 'products' },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      this.serialNumber = counter.value || 1;
    } catch (error) {
      console.error('Error auto-incrementing serialNumber:', error);
    }
  }
  next();
});
ProductSchema.index({ name: 1, restaurantId: 1 }, { unique: true });
ProductSchema.index({ name: 'text', description: 'text' });
