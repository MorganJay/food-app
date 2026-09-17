import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DeliveryOrder,
  DeliveryOrderDocument,
  DeliveryOrderRecordType,
} from '../schemas/DeliveryOrder.schema';

export interface DeliveryOrderFilters {
  recordType?: DeliveryOrderRecordType;
  provider?: string;
  event?: string;
  status?: string;
}

@Injectable()
export class DeliveryOrdersService {
  private readonly logger = new Logger(DeliveryOrdersService.name);

  constructor(
    @InjectModel(DeliveryOrder.name)
    private readonly deliveryOrderModel: Model<DeliveryOrderDocument>,
  ) {}

  async findAll(
    filters: DeliveryOrderFilters = {},
    skip: number = 0,
    limit: number = 20,
  ) {
    const query = {
      recordType: filters.recordType || 'order',
      ...(filters.provider ? { provider: filters.provider } : {}),
      ...(filters.event ? { event: filters.event } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    return this.deliveryOrderModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(Math.max(0, skip))
      .limit(Math.min(Math.max(1, limit), 100))
      .exec();
  }

  async findById(id: string) {
    const order = await this.deliveryOrderModel.findById(id).exec();
    if (!order) {
      throw new Error(`Delivery order with id ${id} not found`);
    }
    return order;
  }

  async findOrdersPendingStatusPolling() {
    return this.deliveryOrderModel
      .find({
        recordType: 'order',
        provider: 'dbgl',
        orderId: { $exists: true, $ne: null },
        status: { $nin: ['delivered', 'cancelled', 'failed'] },
        shipmentStatus: { $nin: ['delivered', 'cancelled', 'failed'] },
      })
      .select({ orderId: 1 })
      .limit(100)
      .exec();
  }

  async upsertFromProvider(
    payload: Record<string, any>,
    recordType: DeliveryOrderRecordType = 'order',
  ) {
    const provider = payload.provider || 'unknown';
    const orderId = payload.orderId;
    const partnerOrderRef = payload.partnerOrderRef;
    const trackingNumber = payload.trackingNumber;

    if (!orderId && !partnerOrderRef && !trackingNumber) {
      this.logger.warn(
        'Provider payload missing identifiers; skipping persistence.',
        {
          payload,
        },
      );
      return payload;
    }

    const recordKey =
      recordType === 'order'
        ? undefined
        : [
            provider,
            recordType,
            orderId || partnerOrderRef || trackingNumber,
            payload.event || payload.status || '',
            payload.timestamp ||
              payload.updatedAt ||
              payload.vendorCreatedAt ||
              '',
          ].join(':');
    const query = recordKey
      ? { recordKey }
      : orderId
        ? { orderId, recordType }
        : partnerOrderRef
          ? { partnerOrderRef, recordType }
          : { trackingNumber, recordType };

    const existing = await this.deliveryOrderModel.findOne(query).exec();

    const normalized = {
      orderId: orderId ?? existing?.orderId,
      partnerOrderRef: partnerOrderRef ?? existing?.partnerOrderRef,
      trackingNumber: trackingNumber ?? existing?.trackingNumber,
      recordType,
      provider,
      event: payload.event ?? existing?.event,
      recordKey: recordKey ?? existing?.recordKey,
      status: payload.status ?? existing?.status,
      shipmentStatus: payload.shipmentStatus ?? existing?.shipmentStatus,
      paymentStatus: payload.paymentStatus ?? existing?.paymentStatus,
      paymentLinkUrl: payload.paymentLinkUrl ?? existing?.paymentLinkUrl,
      deliveryPin: payload.deliveryPin ?? existing?.deliveryPin,
      totalAmount: payload.totalAmount ?? existing?.totalAmount,
      discountPercent: payload.discountPercent ?? existing?.discountPercent,
      discountAmount: payload.discountAmount ?? existing?.discountAmount,
      currency: payload.currency ?? existing?.currency,
      reviewRequired: Boolean(
        payload.reviewRequired ?? existing?.reviewRequired,
      ),
      rawPayload: { ...(existing?.rawPayload || {}), ...(payload || {}) },
      vendorCreatedAt: payload.vendorCreatedAt
        ? new Date(payload.vendorCreatedAt)
        : existing?.vendorCreatedAt,
      confirmedAt: payload.confirmedAt
        ? new Date(payload.confirmedAt)
        : undefined,
      pickedUpAt: payload.pickedUpAt ? new Date(payload.pickedUpAt) : undefined,
      deliveredAt: payload.deliveredAt
        ? new Date(payload.deliveredAt)
        : undefined,
      cancelledAt: payload.cancelledAt
        ? new Date(payload.cancelledAt)
        : undefined,
    };

    if (existing) {
      Object.assign(existing, normalized);
      await existing.save();
    } else {
      await this.deliveryOrderModel.create(normalized);
    }

    if (recordType !== 'order' && orderId) {
      const canonicalOrder = await this.deliveryOrderModel
        .findOne({ orderId, recordType: 'order' })
        .exec();

      if (canonicalOrder) {
        const stateFields = [
          'status',
          'shipmentStatus',
          'paymentStatus',
          'paymentLinkUrl',
          'deliveryPin',
          'totalAmount',
          'discountPercent',
          'discountAmount',
          'currency',
          'reviewRequired',
          'vendorCreatedAt',
          'confirmedAt',
          'pickedUpAt',
          'deliveredAt',
          'cancelledAt',
        ] as const;

        for (const field of stateFields) {
          if (normalized[field] !== undefined) {
            (canonicalOrder as any)[field] = normalized[field];
          }
        }

        await canonicalOrder.save();
      }
    }

    return existing || this.deliveryOrderModel.findOne(query).exec();
  }
}
