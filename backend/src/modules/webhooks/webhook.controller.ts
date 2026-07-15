import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { timingSafeEqual, randomBytes } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WebhookHandlerService } from './webhook-handler.service';
import { TenantService } from '../tenant/tenant.service';
import { AsaasService } from '../asaas/asaas.service';

@Controller('webhooks/asaas')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly handler: WebhookHandlerService,
    private readonly tenantService: TenantService,
    private readonly asaasService: AsaasService,
  ) {}

  @Post(':tenantId')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('tenantId') tenantId: string,
    @Body() payload: Record<string, any>,
    @Headers('asaas-access-token') receivedToken?: string,
  ) {
    const tenant = await this.tenantService.findByIdWithAsaasConfig(tenantId);

    if (
      !tenant
      || !tenant.asaasWebhookAuthToken
      || !this.isValidWebhookToken(receivedToken, tenant.asaasWebhookAuthToken)
    ) {
      throw new UnauthorizedException('Webhook authentication failed');
    }

    if (!payload?.id || !payload?.event) {
      throw new BadRequestException('Payload do webhook sem id ou event');
    }

    this.logger.log(`Webhook recebido: ${payload.event} (${payload.id})`);

    await this.handler.handleEvent(
      tenant.id,
      String(payload.id),
      String(payload.event),
      payload,
      {
        tenantId: tenant.id,
        apiKey: tenant.asaasApiKey,
        sandbox: tenant.asaasSandbox,
      },
    );

    return { received: true };
  }

  @Post('configure/:tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async configureWebhook(
    @Param('tenantId') tenantId: string,
    @Body() body: { url: string; email?: string; events?: string[] },
  ) {
    const tenant = await this.tenantService.findByIdWithAsaasConfig(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }
    if (!tenant.asaasApiKey) {
      throw new BadRequestException('Chave da API Asaas não configurada para o tenant');
    }
    if (!body.url?.trim()) {
      throw new BadRequestException('URL pública do webhook é obrigatória');
    }

    const webhookUrl = this.buildTenantWebhookUrl(body.url, tenant.id);
    const authToken = randomBytes(32).toString('hex');
    const events = body.events || [
      'PAYMENT_RECEIVED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_OVERDUE',
      'PAYMENT_DELETED',
      'PAYMENT_REFUNDED',
      'SUBSCRIPTION_INACTIVATED',
      'SUBSCRIPTION_DELETED',
    ];

    const webhook = await this.asaasService.createWebhook(
      {
        name: `Webhook ${tenant.name}`,
        url: webhookUrl,
        email: body.email || 'suporte@wizer.digital',
        events,
        authToken,
      },
      {
        tenantId: tenant.id,
        apiKey: tenant.asaasApiKey,
        sandbox: tenant.asaasSandbox,
      },
    );

    await this.tenantService.updateAsaasConfig(tenantId, {
      asaasWebhookUrl: webhookUrl,
    });
    await this.tenantService.update(tenantId, {
      asaasWebhookId: webhook.id,
      asaasWebhookAuthToken: authToken,
    });

    return {
      webhookId: webhook.id,
      url: webhookUrl,
      authTokenConfigured: true,
      events,
    };
  }

  private buildTenantWebhookUrl(baseUrl: string, tenantId: string): string {
    const normalized = baseUrl.trim().replace(/\/+$/, '');
    return normalized.endsWith(`/${tenantId}`)
      ? normalized
      : `${normalized}/${tenantId}`;
  }

  private isValidWebhookToken(received?: string, expected?: string): boolean {
    if (!received || !expected) {
      return false;
    }

    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }
}
