import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookHandlerService } from './webhook-handler.service';

@Controller('webhooks/asaas')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly handler: WebhookHandlerService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Body() payload: Record<string, any>,
    @Headers('asaas-access-token') token: string,
  ) {
    this.logger.log(`Webhook received: ${payload?.event}`);

    // TODO: validate asaas-access-token when webhook is configured per tenant
    // For now, use a default tenant or resolve from webhook URL
    const tenantId = 'default'; // Will be resolved per-tenant URL later

    try {
      await this.handler.handleEvent(tenantId, payload.id, payload.event, payload);
    } catch (err) {
      this.logger.error('Webhook processing failed', err);
    }

    return { received: true };
  }
}
