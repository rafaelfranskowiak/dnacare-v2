import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AsaasTenantContext {
  tenantId: string;
  apiKey: string;
  sandbox: boolean;
}

interface AsaasCustomerInput {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  province?: string;
  externalReference?: string;
}

interface AsaasPaymentInput {
  customerId: string;
  billingType: 'BOLETO' | 'CREDIT_CARD';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}

interface AsaasSubscriptionInput {
  customerId: string;
  billingType: 'BOLETO' | 'CREDIT_CARD';
  value: number;
  nextDueDate: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  externalReference?: string;
}

interface AsaasSubscriptionUpdateInput {
  status: 'ACTIVE' | 'INACTIVE';
  nextDueDate?: string;
}

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  constructor(private readonly configService: ConfigService) {}

  private validateContext(context: AsaasTenantContext): AsaasTenantContext {
    if (!context?.tenantId || !context?.apiKey) {
      throw new BadRequestException('Configuração Asaas ausente para a unidade');
    }

    return context;
  }

  private getBaseUrl(sandbox: boolean): string {
    return sandbox
      ? 'https://api-sandbox.asaas.com'
      : 'https://api.asaas.com';
  }

  private async request<T>(
    method: string,
    path: string,
    contextInput: AsaasTenantContext,
    body?: Record<string, any>,
  ): Promise<T> {
    const context = this.validateContext(contextInput);
    const baseUrl = this.getBaseUrl(context.sandbox);
    const url = `${baseUrl}/v3${path}`;
    const userAgent = this.configService.get<string>(
      'ASAAS_USER_AGENT',
      'DNACare/0.1.0 (Node.js)',
    );

    this.logger.debug(
      `[tenant=${context.tenantId}] ${method} ${baseUrl}/v3${path}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          access_token: context.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[tenant=${context.tenantId}] Falha de comunicação com Asaas: ${message}`,
      );
      throw new BadRequestException('Não foi possível comunicar com o gateway de pagamento');
    }

    const rawBody = await response.text();
    let data: any = {};

    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = { message: rawBody };
      }
    }

    if (!response.ok) {
      const errors = data?.errors || [];
      const message = errors
        .map((error: any) => error.description || error.code)
        .join(', ')
        || data?.message
        || 'Asaas API error';

      this.logger.error(
        `[tenant=${context.tenantId}] Asaas ${method} ${path} falhou (${response.status}): ${message}`,
      );
      throw new BadRequestException(`Erro na integração com gateway de pagamento: ${message}`);
    }

    return data as T;
  }

  async createCustomer(
    input: AsaasCustomerInput,
    context: AsaasTenantContext,
  ): Promise<any> {
    return this.request('POST', '/customers', context, input);
  }

  async findCustomerByCpfCnpj(
    cpfCnpj: string,
    context: AsaasTenantContext,
  ): Promise<any> {
    const clean = cpfCnpj.replace(/\D/g, '');
    return this.request(
      'GET',
      `/customers?cpfCnpj=${encodeURIComponent(clean)}`,
      context,
    );
  }

  async getCustomer(id: string, context: AsaasTenantContext): Promise<any> {
    return this.request('GET', `/customers/${encodeURIComponent(id)}`, context);
  }

  async deleteCustomer(id: string, context: AsaasTenantContext): Promise<any> {
    return this.request('DELETE', `/customers/${encodeURIComponent(id)}`, context);
  }

  async createPayment(
    input: AsaasPaymentInput,
    context: AsaasTenantContext,
  ): Promise<any> {
    const { customerId, ...payment } = input;
    return this.request(
      'POST',
      '/payments',
      context,
      { ...payment, customer: customerId },
    );
  }

  async getPayment(id: string, context: AsaasTenantContext): Promise<any> {
    return this.request('GET', `/payments/${encodeURIComponent(id)}`, context);
  }

  async createSubscription(
    input: AsaasSubscriptionInput,
    context: AsaasTenantContext,
  ): Promise<any> {
    const { customerId, ...subscription } = input;
    return this.request(
      'POST',
      '/subscriptions',
      context,
      { ...subscription, customer: customerId },
    );
  }

  async getSubscription(id: string, context: AsaasTenantContext): Promise<any> {
    return this.request('GET', `/subscriptions/${encodeURIComponent(id)}`, context);
  }

  async updateSubscription(
    id: string,
    input: AsaasSubscriptionUpdateInput,
    context: AsaasTenantContext,
  ): Promise<any> {
    return this.request(
      'PUT',
      `/subscriptions/${encodeURIComponent(id)}`,
      context,
      input,
    );
  }

  async cancelSubscription(id: string, context: AsaasTenantContext): Promise<any> {
    return this.request('DELETE', `/subscriptions/${encodeURIComponent(id)}`, context);
  }

  async getSubscriptionPayments(
    subscriptionId: string,
    context: AsaasTenantContext,
    status?: string,
  ): Promise<any> {
    let path = `/subscriptions/${encodeURIComponent(subscriptionId)}/payments`;
    if (status) path += `?status=${encodeURIComponent(status)}`;
    return this.request('GET', path, context);
  }

  async getCustomerPayments(
    customerId: string,
    context: AsaasTenantContext,
    status?: string,
  ): Promise<any> {
    let path = `/payments?customer=${encodeURIComponent(customerId)}`;
    if (status) path += `&status=${encodeURIComponent(status)}`;
    return this.request('GET', path, context);
  }

  async createWebhook(
    config: {
      name: string;
      url: string;
      email: string;
      events: string[];
      authToken: string;
    },
    context: AsaasTenantContext,
  ): Promise<any> {
    return this.request(
      'POST',
      '/webhooks',
      context,
      {
        ...config,
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        sendType: 'SEQUENTIALLY',
      },
    );
  }

  async getWebhooks(context: AsaasTenantContext): Promise<any> {
    return this.request('GET', '/webhooks', context);
  }

  async deleteWebhook(id: string, context: AsaasTenantContext): Promise<any> {
    return this.request('DELETE', `/webhooks/${encodeURIComponent(id)}`, context);
  }
}
