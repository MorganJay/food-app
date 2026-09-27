import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './BaseEntity';

export type DeliveryOrderDocument = HydratedDocument<DeliveryOrder>;
export type DeliveryOrderRecordType =
  | 'order'
  | 'webhook_event'
  | 'status_update';

@Schema({
  collection: 'delivery_orders',
  timestamps: true,
})
export class DeliveryOrder extends BaseEntity {
  @Prop()
  orderId: string;

  @Prop()
  trackingNumber: string;

  @Prop()
  partnerOrderRef: string;

  @Prop({
    required: true,
    default: 'order',
    enum: ['order', 'webhook_event', 'status_update'],
  })
  recordType: DeliveryOrderRecordType;

  @Prop()
  provider: string;

  @Prop()
  event: string;

  @Prop({ unique: true, sparse: true })
  recordKey: string;

  @Prop()
  status: string;

  @Prop()
  shipmentStatus: string;

  @Prop()
  paymentStatus: string;

  @Prop()
  paymentLinkUrl: string;

  @Prop()
  deliveryPin: string;

  @Prop()
  totalAmount: number;

  @Prop()
  discountPercent: number;

  @Prop()
  discountAmount: number;

  @Prop()
  currency: string;

  @Prop({ default: false })
  reviewRequired: boolean;

  @Prop({ type: Object, default: {} })
  rawPayload: Record<string, any>;

  @Prop()
  vendorCreatedAt: Date;

  @Prop()
  confirmedAt: Date;

  @Prop()
  pickedUpAt: Date;

  @Prop()
  deliveredAt: Date;

  @Prop()
  cancelledAt: Date;
}

export const DeliveryOrderSchema = SchemaFactory.createForClass(DeliveryOrder);

DeliveryOrderSchema.index({ partnerOrderRef: 1 });
DeliveryOrderSchema.index({ orderId: 1 });
DeliveryOrderSchema.index({ trackingNumber: 1 });
DeliveryOrderSchema.index({ recordType: 1, createdAt: -1 });
DeliveryOrderSchema.index({ provider: 1, recordType: 1, createdAt: -1 });
