import { Prop } from '@nestjs/mongoose';

export class BaseEntity {
  @Prop({ required: true })
  id: number;

  @Prop({ required: true })
  createdAt: Date;
  updatedAt: Date;
}
