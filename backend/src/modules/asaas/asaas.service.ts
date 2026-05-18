import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  constructor(private readonly configService: ConfigService) {}

  private getBaseUrl(apiKey?: string): string {
    const sandbox = this.configService.get<string>('ASAAS_SANDBOX', 'true');
    return sandbox !== 'false'
      ? 'https://api-sandbox.asaas.com'
      : 'https://api.asaas.com';
  }

  private getApiKey(tenantApiKey?: string): string {
    return tenantApiKey || this.configService.get<string>('ASAAS_API_KEY') || this.configService.get<string>('ASAAS_APIKEY_SANDBOX') || '';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, any>,
    apiKey?: string,
  ): Promise<T> {
    const baseUrl = this.getBaseUrl(apiKey);
    const key = this.getApiKey(apiKey);
    const url = `${baseUrl}/v3${path}`;

    this.logger.debug(`${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: key,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const errors = (data as any)?.errors || [];
      const message = errors.map((e: any) => e.description || e.code).join(', ') || 'Asaas API error';
      this.logger.error(`Asaas ${method} ${path} failed (${response.status}): ${message}`);
      throw new BadRequestException(`Erro na integração com gateway de pagamento: ${message}`);
    }

    return data as T;
  }

  async createCustomer(input: AsaasCustomerInput, apiKey?: string): Promise<any> {
    return this.request('POST', '/customers', input, apiKey);
  }

  async findCustomerByCpfCnpj(cpfCnpj: string, apiKey?: string): Promise<any> {
    const clean = cpfCnpj.replace(/\D/g, '');
    return this.request('GET', `/customers?cpfCnpj=${clean}`, undefined, apiKey);
  }

  async getCustomer(id: string, apiKey?: string): Promise<any> {
    return this.request('GET', `/customers/${id}`, undefined, apiKey);
  }

  async deleteCustomer(id: string, apiKey?: string): Promise<any> {
    return this.request('DELETE', `/customers/${id}`, undefined, apiKey);
  }

  async createPayment(input: AsaasPaymentInput, apiKey?: string): Promise<any> {
    return this.request('POST', '/payments', input, apiKey);
  }

  async getPayment(id: string, apiKey?: string): Promise<any> {
    return this.request('GET', `/payments/${id}`, undefined, apiKey);
  }

  async createSubscription(input: AsaasSubscriptionInput, apiKey?: string): Promise<any> {
    return this.request('POST', '/subscriptions', input, apiKey);
  }

  async getSubscription(id: string, apiKey?: string): Promise<any> {
    return this.request('GET', `/subscriptions/${id}`, undefined, apiKey);
  }

  async cancelSubscription(id: string, apiKey?: string): Promise<any> {
    return this.request('DELETE', `/subscriptions/${id}`, undefined, apiKey);
  }

  async getSubscriptionPayments(subscriptionId: string, status?: string, apiKey?: string): Promise<any> {
    let path = `/subscriptions/${subscriptionId}/payments`;
    if (status) path += `?status=${status}`;
    return this.request('GET', path, undefined, apiKey);
  }

  async getCustomerPayments(customerId: string, status?: string, apiKey?: string): Promise<any> {
    let path = `/payments?customer=${customerId}`;
    if (status) path += `&status=${status}`;
    return this.request('GET', path, undefined, apiKey);
  }

  async createWebhook(config: {
    name: string;
    url: string;
    email: string;
    events: string[];
    authToken: string;
  }, apiKey?: string): Promise<any> {
    return this.request('POST', '/webhooks', {
      ...config,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      sendType: 'NON_SEQUENTIALLY',
    }, apiKey);
  }

  async getWebhooks(apiKey?: string): Promise<any> {
    return this.request('GET', '/webhooks', undefined, apiKey);
  }

  async deleteWebhook(id: string, apiKey?: string): Promise<any> {
    return this.request('DELETE', `/webhooks/${id}`, undefined, apiKey);
  }
}
