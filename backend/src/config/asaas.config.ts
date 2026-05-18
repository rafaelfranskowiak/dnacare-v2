import { registerAs } from '@nestjs/config';

export default registerAs('asaas', () => ({
  apiKey: process.env.ASAAS_APIKEY_SANDBOX || process.env.ASAAS_API_KEY,
  sandbox: process.env.ASAAS_SANDBOX !== 'false',
  baseUrl: process.env.ASAAS_SANDBOX !== 'false'
    ? 'https://api-sandbox.asaas.com'
    : 'https://api.asaas.com',
}));
