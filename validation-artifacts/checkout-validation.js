const path = require('path');
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
const fs = require('fs');

const base = 'http://127.0.0.1:4003/api';
const tenant = 'dnacare-sandbox';

async function request(method, url, token, body) {
  const response = await fetch(base + url, { method, headers: { 'x-tenant-id': tenant, Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let json = null;
  try { json = await response.json(); } catch {}
  return { status: response.status, message: Array.isArray(json?.message) ? json.message.join(';') : String(json?.message || '') };
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const loginResponse = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'x-tenant-id': tenant, 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.VALIDATION_ADMIN_EMAIL, password: process.env.VALIDATION_ADMIN_PASSWORD }) });
  const login = await loginResponse.json();
  const opp = await db.query("select id, plan_version_id, payment_method from opportunities where tenant_id = $1 and status = 'aberta' order by id limit 1", ['86c372af-b374-41e3-8399-4c3b152ee0f6']);
  if (!opp.rows[0]) throw new Error('no open sandbox opportunity available');
  const before = await db.query('select count(*)::int as count from sales where tenant_id = $1', ['86c372af-b374-41e3-8399-4c3b152ee0f6']);
  const creditCard = await request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, login.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'CREDIT_CARD' });
  const boleto = await request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, login.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'BOLETO' });
  const boletoRetry = await request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, login.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'BOLETO' });
  const concurrent = await Promise.all([
    request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, login.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'BOLETO' }),
    request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, login.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'BOLETO' }),
  ]);
  const after = await db.query('select count(*)::int as count from sales where tenant_id = $1', ['86c372af-b374-41e3-8399-4c3b152ee0f6']);
  const results = [
    { id: 'CHK-01', status: boleto.status === 400 && after.rows[0].count === before.rows[0].count ? 'PASSOU' : 'FALHOU', http: boleto.status, expected: 400, detail: 'tenant sem configuração Asaas falha antes de criar venda', salesBefore: before.rows[0].count, salesAfter: after.rows[0].count },
    { id: 'CHK-02', status: creditCard.status === 400 ? 'PASSOU' : 'FALHOU', http: creditCard.status, expected: 400, detail: 'CREDIT_CARD rejeitado explicitamente pelo DTO/endpoint', messageSafe: !/key|token|password|secret/i.test(creditCard.message) },
    { id: 'CHK-03', status: boletoRetry.status === 400 && after.rows[0].count === before.rows[0].count ? 'PASSOU' : 'FALHOU', http: boletoRetry.status, expected: 400, detail: 'repetição permanece no preflight sem criar duplicata' },
    { id: 'CHK-03-CONCURRENT', status: concurrent.every((item) => item.status === 400) && after.rows[0].count === before.rows[0].count ? 'PASSOU' : 'FALHOU', http: concurrent.map((item) => item.status), expected: [400, 400], detail: 'concorrência bloqueada antes do gateway por configuração ausente' },
    { id: 'CHK-04', status: 'BLOQUEADO', detail: 'sem chave Sandbox Asaas configurada no tenant; E2E externo, payload customer/billingType/externalReference e reutilização de cliente não executáveis' },
  ];
  const output = JSON.stringify(results, null, 2) + '\n';
  fs.writeFileSync(path.join(__dirname, 'checkout-validation-results.json'), output, 'utf8');
  console.log(output);
  await db.end();
}

main().catch((error) => { console.error(`CHECKOUT_VALIDATION_FAILED: ${error.message}`); process.exit(1); });
