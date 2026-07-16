const path = require('path');
require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'pg'));
const fs = require('fs');

const port = process.env.VALIDATION_PORT || '4015';
const base = `http://127.0.0.1:${port}/api`;
const tenantA = 'dnacare-sandbox';
const tenantB = 'default';
const tenantAId = '86c372af-b374-41e3-8399-4c3b152ee0f6';
const syntheticToken = 'phase3-synthetic-webhook-token';

async function request(method, url, tenant, token, body) {
  const headers = { 'x-tenant-id': tenant, 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await response.json(); } catch {}
  return { status: response.status, json };
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const adminLogin = await request('POST', '/auth/login', tenantA, null, { email: process.env.VALIDATION_ADMIN_EMAIL, password: process.env.VALIDATION_ADMIN_PASSWORD });
  const repLogin = await request('POST', '/auth/login', tenantA, null, { email: process.env.VALIDATION_REP_EMAIL, password: process.env.VALIDATION_REP_PASSWORD });
  const results = [];
  results.push({ id: 'REG-01', status: adminLogin.status === 201 ? 'PASSOU' : 'FALHOU', http: adminLogin.status, expected: 201, detail: 'login admin' });
  results.push({ id: 'REG-02', status: repLogin.status === 201 ? 'PASSOU' : 'FALHOU', http: repLogin.status, expected: 201, detail: 'login representante' });
  const own = await request('GET', '/opportunities', tenantA, adminLogin.json?.accessToken);
  results.push({ id: 'REG-03', status: own.status === 200 ? 'PASSOU' : 'FALHOU', http: own.status, expected: 200, detail: 'admin own tenant' });
  const globalAsRep = await request('GET', '/tenants', tenantA, repLogin.json?.accessToken);
  results.push({ id: 'REG-04', status: globalAsRep.status === 403 ? 'PASSOU' : 'FALHOU', http: globalAsRep.status, expected: 403, detail: 'representante global admin' });
  const cross = await request('GET', '/opportunities', tenantB, repLogin.json?.accessToken);
  results.push({ id: 'REG-05', status: cross.status === 403 ? 'PASSOU' : 'FALHOU', http: cross.status, expected: 403, detail: 'cross tenant without active link' });

  const missingWebhook = await request('POST', `/webhooks/asaas/${tenantAId}`, tenantA, null, { id: 'phase3-invalid-001', event: 'UNSUPPORTED_EVENT' });
  results.push({ id: 'REG-06', status: missingWebhook.status === 401 ? 'PASSOU' : 'FALHOU', http: missingWebhook.status, expected: 401, detail: 'invalid webhook token' });
  const tenant = await db.query('select asaas_webhook_auth_token from tenants where id = $1', [tenantAId]);
  const previousToken = tenant.rows[0]?.asaas_webhook_auth_token || null;
  try {
    await db.query('update tenants set asaas_webhook_auth_token = $1 where id = $2', [syntheticToken, tenantAId]);
    const concurrent = await Promise.all([
      fetch(`${base}/webhooks/asaas/${tenantAId}`, { method: 'POST', headers: { 'asaas-access-token': syntheticToken, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'phase3-duplicate-001', event: 'UNSUPPORTED_EVENT' }) }),
      fetch(`${base}/webhooks/asaas/${tenantAId}`, { method: 'POST', headers: { 'asaas-access-token': syntheticToken, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'phase3-duplicate-001', event: 'UNSUPPORTED_EVENT' }) }),
    ]);
    const eventCount = await db.query('select count(*)::int as count from webhook_events where asaas_event_id = $1', ['phase3-duplicate-001']);
    results.push({ id: 'REG-07', status: concurrent.every((response) => response.status === 200) && eventCount.rows[0].count === 1 ? 'PASSOU' : 'FALHOU', http: concurrent.map((response) => response.status), expected: [200, 200], dbCount: eventCount.rows[0].count });
  } finally {
    await db.query('update tenants set asaas_webhook_auth_token = $1 where id = $2', [previousToken, tenantAId]);
    await db.query('delete from webhook_events where asaas_event_id = $1', ['phase3-duplicate-001']);
  }

  const opp = await db.query("select id, plan_version_id from opportunities where tenant_id = $1 and status = 'aberta' order by id limit 1", [tenantAId]);
  const beforeSales = await db.query('select count(*)::int as count from sales where tenant_id = $1', [tenantAId]);
  if (opp.rows[0]) {
    const card = await request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, tenantA, adminLogin.json?.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'CREDIT_CARD' });
    const boleto = await request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, tenantA, adminLogin.json?.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'BOLETO' });
    const afterSales = await db.query('select count(*)::int as count from sales where tenant_id = $1', [tenantAId]);
    results.push({ id: 'REG-08', status: card.status === 400 ? 'PASSOU' : 'FALHOU', http: card.status, expected: 400, detail: 'credit card rejected' });
    results.push({ id: 'REG-09', status: boleto.status === 400 && afterSales.rows[0].count === beforeSales.rows[0].count ? 'PASSOU' : 'FALHOU', http: boleto.status, expected: 400, detail: 'checkout without tenant Asaas config', salesBefore: beforeSales.rows[0].count, salesAfter: afterSales.rows[0].count });
  } else {
    results.push({ id: 'REG-08', status: 'BLOQUEADO', detail: 'no open opportunity fixture' });
    results.push({ id: 'REG-09', status: 'BLOQUEADO', detail: 'no open opportunity fixture' });
  }
  const holder = await db.query("select id from clients where tenant_id = $1 and type = 'holder' order by id limit 1", [tenantAId]);
  if (holder.rows[0]) {
    const settle = await request('POST', `/clients/${holder.rows[0].id}/settle-debts`, tenantA, adminLogin.json?.accessToken);
    results.push({ id: 'REG-10', status: settle.status === 400 ? 'PASSOU' : 'FALHOU', http: settle.status, expected: 400, detail: 'consolidated settlement blocked' });
  } else {
    results.push({ id: 'REG-10', status: 'BLOQUEADO', detail: 'no holder fixture' });
  }
  results.push({ id: 'REG-11', status: 'BLOQUEADO', detail: 'new constraint tests require successful migration; Asaas E2E requires valid Sandbox tenant key' });
  const output = JSON.stringify(results, null, 2) + '\n';
  fs.writeFileSync(path.join(__dirname, 'regression-results.json'), output, 'utf8');
  console.log(output);
  await db.end();
}

main().catch((error) => { console.error(`PHASE3_REGRESSION_FAILED: ${error.message}`); process.exit(1); });
