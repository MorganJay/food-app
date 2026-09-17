import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { createHmac, timingSafeEqual } from 'crypto';
import axios from 'axios';
import { DeliveryOrdersService } from '../delivery-orders/delivery-orders.service';

@Injectable()
export class DbglService {
  private readonly logger = new Logger(DbglService.name);
  private pollingInProgress = false;

  constructor(private readonly deliveryOrdersService: DeliveryOrdersService) {}

  private getBaseUrl(): string {
    return process.env.DBGL_BASE_URL || 'https://sandbox.dbgl.ng';
  }

  private getHeaders() {
    return {
      'X-Api-Key': process.env.DBGL_API_KEY,
      'X-Api-Secret': process.env.DBGL_API_SECRET,
      'Content-Type': 'application/json',
    };
  }

  isStatusPollingEnabled(): boolean {
    const environment = process.env.NODE_ENV?.toLowerCase();
    return (
      process.env.DBGL_STATUS_POLLING_ENABLED === 'true' &&
      environment !== 'production' &&
      environment !== 'staging'
    );
  }

  @Interval('dbgl-status-polling', 60_000)
  async pollPendingOrderStatuses(): Promise<void> {
    if (!this.isStatusPollingEnabled() || this.pollingInProgress) {
      return;
    }

    this.pollingInProgress = true;
    try {
      const orders =
        await this.deliveryOrdersService.findOrdersPendingStatusPolling();

      await Promise.all(
        orders.map(async (order) => {
          if (!order.orderId) {
            return;
          }

          try {
            await this.fetchStatusByOrderId(order.orderId);
          } catch (error) {
            this.logger.warn(
              `DBGL status polling failed for order ${order.orderId}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
      );
    } finally {
      this.pollingInProgress = false;
    }
  }

  async pollStatusByOrderId(orderId: string) {
    if (!this.isStatusPollingEnabled()) {
      throw new BadRequestException(
        'DBGL status polling is disabled. Use the configured webhook in this environment.',
      );
    }

    return this.fetchStatusByOrderId(orderId);
  }

  private toDeliveryOrderRecord(
    payload: Record<string, any>,
    endpoint: string,
  ): Record<string, any> {
    return {
      ...payload,
      orderId: payload.order_id ?? payload.orderId,
      partnerOrderRef: payload.partner_order_ref ?? payload.partnerOrderRef,
      trackingNumber: payload.waybill_no ?? payload.trackingNumber,
      shipmentStatus: payload.shipment_status ?? payload.shipmentStatus,
      paymentStatus: payload.payment_status ?? payload.paymentStatus,
      paymentLinkUrl: payload.payment_link_url ?? payload.paymentLinkUrl,
      deliveryPin: payload.delivery_pin ?? payload.deliveryPin,
      totalAmount: payload.total_amount ?? payload.totalAmount,
      discountPercent: payload.discount_percent ?? payload.discountPercent,
      discountAmount: payload.discount_amount ?? payload.discountAmount,
      reviewRequired: payload.review_required ?? payload.reviewRequired,
      vendorCreatedAt: payload.created_at ?? payload.vendorCreatedAt,
      confirmedAt: payload.confirmed_at ?? payload.confirmedAt,
      pickedUpAt: payload.picked_up_at ?? payload.pickedUpAt,
      deliveredAt: payload.delivered_at ?? payload.deliveredAt,
      cancelledAt: payload.cancelled_at ?? payload.cancelledAt,
      provider: 'dbgl',
      endpoint,
    };
  }

  async quote(payload: Record<string, any>) {
    const response = await axios.post(
      `${this.getBaseUrl()}/apip/api/orders_quote.php`,
      payload,
      { headers: this.getHeaders() },
    );

    return response.data;
  }

  async createOrder(payload: Record<string, any>) {
    const response = await axios.post(
      `${this.getBaseUrl()}/apip/api/orders_create.php`,
      payload,
      { headers: this.getHeaders() },
    );

    return this.deliveryOrdersService.upsertFromProvider(
      this.toDeliveryOrderRecord(
        { ...payload, ...response.data },
        'orders_create',
      ),
      'order',
    );
  }

  async fetchStatusByOrderId(orderId: string) {
    const response = await axios.get(
      `${this.getBaseUrl()}/apip/api/orders_status.php`,
      { params: { order_id: orderId }, headers: this.getHeaders() },
    );

    return this.deliveryOrdersService.upsertFromProvider(
      this.toDeliveryOrderRecord(response.data, 'orders_status'),
      'status_update',
    );
  }

  async fetchStatusByPartnerOrderRef(partnerOrderRef: string) {
    const response = await axios.get(
      `${this.getBaseUrl()}/apip/api/orders_status.php`,
      {
        params: { partner_order_ref: partnerOrderRef },
        headers: this.getHeaders(),
      },
    );

    return this.deliveryOrdersService.upsertFromProvider(
      this.toDeliveryOrderRecord(response.data, 'orders_status'),
      'status_update',
    );
  }

  async handleWebhook(
    payload: Record<string, any>,
    signature: string | string[] | undefined,
    rawBody: Buffer | undefined,
  ) {
    this.verifyWebhookSignature(signature, rawBody);
    return this.deliveryOrdersService.upsertFromProvider(
      this.toDeliveryOrderRecord(payload, 'webhook'),
      'webhook_event',
    );
  }

  private verifyWebhookSignature(
    signature: string | string[] | undefined,
    rawBody: Buffer | undefined,
  ): void {
    const webhookSecret = process.env.DBGL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new UnauthorizedException('DBGL webhook secret is not configured');
    }

    if (!signature || Array.isArray(signature) || !rawBody) {
      throw new UnauthorizedException('Invalid DBGL webhook signature');
    }

    const providedSignature = String(signature).trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(providedSignature)) {
      throw new UnauthorizedException('Invalid DBGL webhook signature');
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(providedSignature, 'hex');

    if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
      throw new UnauthorizedException('Invalid DBGL webhook signature');
    }
  }
}
