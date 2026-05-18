import { Controller, Post, Body, Param, Headers, Logger, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WebhookHandlerService } from './webhook-handler.service';
import { TenantService } from '../tenant/tenant.service';
import { AsaasService } from '../asaas/asaas.service';
import { randomBytes } from 'crypto';

@Controller('webhooks/asaas')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly handler: WebhookHandlerService,
    private readonly tenantService: TenantService,
    private readonly asaasService: AsaasService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Body() payload: Record<string, any>,
    @Headers('asaas-access-token') token: string,
  ) {
    this.logger.log(`Webhook received: ${payload?.event}`);
    const tenantId = 'default';
    try {
      await this.handler.handleEvent(tenantId, payload.id, payload.event, payload);
    } catch (err) {
      this.logger.error('Webhook processing failed', err);
    }
    return { received: true };
  }

  @Post('configure/:tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async configureWebhook(
    @Param('tenantId') tenantId: string,
    @Body() body: { url: string; email?: string; events?: string[] },
  ) {
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) throw new (await import('@nestjs/common')).NotFoundException('Tenant não encontrado');

    const authToken = randomBytes(32).toString('hex');
    const events = body.events || [
      'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE',
      'PAYMENT_DELETED', 'PAYMENT_REFUNDED',
      'SUBSCRIPTION_INACTIVATED', 'SUBSCRIPTION_DELETED',
    ];

    const webhook = await this.asaasService.createWebhook({
      name: `Webhook ${tenant.name}`,
      url: body.url,
      email: body.email || 'suporte@wizer.digital',
      events,
      authToken,
    }, tenant.asaasApiKey);

    await this.tenantService.updateAsaasConfig(tenantId, {
      asaasWebhookUrl: body.url,
    });
    await this.tenantService.update(tenantId, {
      asaasWebhookId: webhook.id,
      asaasWebhookAuthToken: authToken,
    } as any);

    return {
      webhookId: webhook.id,
      url: body.url,
      authToken,
      events,
    };
  }
}
