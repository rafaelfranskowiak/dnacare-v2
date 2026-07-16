const path = require('path');
const fs = require('fs');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config({ path: path.join(process.cwd(), '.env') });

const port = process.env.VALIDATION_PORT || '4017';
const base = `http://127.0.0.1:${port}/api`;
const tenantSlug = 'dnacare-sandbox';
const tenantId = '86c372af-b374-41e3-8399-4c3b152ee0f6';
const output = process.env.VALIDATION_OUTPUT || path.join('..', '..', 'validation-artifacts', 'phase3-1', 'regression-results.json');

async function request(method, url, tenant, token, body) {
  const headers = { 'x-tenant-id': tenant, 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    let json = null; try { json = await response.json(); } catch {}
    return { status: response.status, json };
  } catch (error) { return { status: 0, error: String(error.message || error).slice(0, 160) }; }
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const results = [];
  const admin = await request('POST', '/auth/login', tenantSlug, null, { email: process.env.VALIDATION_ADMIN_EMAIL, password: process.env.VALIDATION_ADMIN_PASSWORD });
  const rep = await request('POST', '/auth/login', tenantSlug, null, { email: process.env.VALIDATION_REP_EMAIL, password: process.env.VALIDATION_REP_PASSWORD });
  results.push({ id: 'REG-01', status: admin.status === 201 ? 'PASSOU' : 'FALHOU', http: admin.status, expected: 201, detail: 'login administrador' });
  results.push({ id: 'REG-02', status: rep.status === 201 ? 'PASSOU' : 'FALHOU', http: rep.status, expected: 201, detail: 'login representante' });
  const own = await request('GET', '/opportunities', tenantSlug, admin.json?.accessToken);
  results.push({ id: 'REG-03', status: own.status === 200 ? 'PASSOU' : 'FALHOU', http: own.status, expected: 200, detail: 'acesso ao próprio tenant' });
  const globalRep = await request('GET', '/tenants', tenantSlug, rep.json?.accessToken);
  results.push({ id: 'REG-04', status: globalRep.status === 403 ? 'PASSOU' : 'FALHOU', http: globalRep.status, expected: 403, detail: 'representante sem administração global' });
  const cross = await request('GET', '/opportunities', 'default', rep.json?.accessToken);
  results.push({ id: 'REG-05', status: cross.status === 403 ? 'PASSOU' : 'FALHOU', http: cross.status, expected: 403, detail: 'acesso cross-tenant sem vínculo' });
  const missingWebhook = await request('POST', `/webhooks/asaas/${tenantId}`, tenantSlug, null, { id: 'phase31-invalid-001', event: 'UNSUPPORTED_EVENT' });
  results.push({ id: 'REG-06', status: missingWebhook.status === 401 ? 'PASSOU' : 'FALHOU', http: missingWebhook.status, expected: 401, detail: 'webhook sem token' });

  const previous = await db.query('SELECT asaas_webhook_auth_token FROM tenants WHERE id = $1', [tenantId]);
  const previousToken = previous.rows[0]?.asaas_webhook_auth_token || null;
  const syntheticToken = 'phase31-synthetic-webhook-token';
  try {
    await db.query('UPDATE tenants SET asaas_webhook_auth_token = $1 WHERE id = $2', [syntheticToken, tenantId]);
    const webhookRequest = () => fetch(`${base}/webhooks/asaas/${tenantId}`, { method: 'POST', headers: { 'asaas-access-token': syntheticToken, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'phase31-duplicate-001', event: 'UNSUPPORTED_EVENT' }) });
    const responses = await Promise.all([webhookRequest(), webhookRequest()]);
    const eventCount = await db.query('SELECT COUNT(*)::int AS count FROM webhook_events WHERE asaas_event_id = $1', ['phase31-duplicate-001']);
    results.push({ id: 'REG-07', status: responses.every((r) => r.status === 200) && eventCount.rows[0].count === 1 ? 'PASSOU' : 'FALHOU', http: responses.map((r) => r.status), expected: [200, 200], dbCount: eventCount.rows[0].count, detail: 'webhook duplicado' });
  } finally {
    await db.query('UPDATE tenants SET asaas_webhook_auth_token = $1 WHERE id = $2', [previousToken, tenantId]);
    await db.query('DELETE FROM webhook_events WHERE asaas_event_id = $1', ['phase31-duplicate-001']);
  }

  const opp = await db.query("SELECT id, plan_version_id FROM opportunities WHERE tenant_id = $1 AND status = 'aberta' ORDER BY id LIMIT 1", [tenantId]);
  if (opp.rows[0] && admin.json?.accessToken) {
    const before = await db.query('SELECT COUNT(*)::int AS count FROM sales WHERE tenant_id = $1', [tenantId]);
    const card = await request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, tenantSlug, admin.json.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'CREDIT_CARD' });
    const boleto = await request('POST', `/opportunities/${opp.rows[0].id}/generate-checkout`, tenantSlug, admin.json.accessToken, { planVersionId: opp.rows[0].plan_version_id, paymentMethod: 'BOLETO' });
    const after = await db.query('SELECT COUNT(*)::int AS count FROM sales WHERE tenant_id = $1', [tenantId]);
    results.push({ id: 'REG-08', status: card.status === 400 ? 'PASSOU' : 'FALHOU', http: card.status, expected: 400, detail: 'CREDIT_CARD rejeitado' });
    results.push({ id: 'REG-09', status: boleto.status === 400 && after.rows[0].count === before.rows[0].count ? 'PASSOU' : 'FALHOU', http: boleto.status, expected: 400, salesBefore: before.rows[0].count, salesAfter: after.rows[0].count, detail: 'checkout sem Asaas não cria venda' });
  } else {
    results.push({ id: 'REG-08', status: 'BLOQUEADO', detail: 'fixture de oportunidade aberta ou login indisponível' });
    results.push({ id: 'REG-09', status: 'BLOQUEADO', detail: 'fixture de oportunidade aberta ou login indisponível' });
  }
  const holder = await db.query("SELECT id FROM clients WHERE tenant_id = $1 AND type = 'holder' ORDER BY id LIMIT 1", [tenantId]);
  if (holder.rows[0] && admin.json?.accessToken) {
    const settle = await request('POST', `/clients/${holder.rows[0].id}/settle-debts`, tenantSlug, admin.json.accessToken);
    results.push({ id: 'REG-10', status: settle.status === 400 ? 'PASSOU' : 'FALHOU', http: settle.status, expected: 400, detail: 'quitação consolidada bloqueada' });
  } else results.push({ id: 'REG-10', status: 'BLOQUEADO', detail: 'fixture de titular ou login indisponível' });
  results.push({ id: 'REG-11', status: 'BLOQUEADO', detail: 'E2E Asaas requer chave Sandbox válida; migração pendente bloqueia os cenários dependentes das novas colunas' });
  fs.writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), port, results }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(results, null, 2));
  await db.end();
}
main().catch(async (error) => { console.error(String(error.message || error).slice(0, 240)); process.exit(1); });
