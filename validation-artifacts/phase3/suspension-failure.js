const path = require('path');
require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'pg'));
const fs = require('fs');
const tenantId = '86c372af-b374-41e3-8399-4c3b152ee0f6';
const port = process.env.VALIDATION_PORT || '4016';
const base = `http://127.0.0.1:${port}/api`;

async function request(method, url, token, body) {
  const response = await fetch(base + url, { method, headers: { 'x-tenant-id': 'dnacare-sandbox', Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await response.json(); } catch {}
  return { status: response.status, json };
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const loginResponse = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'x-tenant-id': 'dnacare-sandbox', 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.VALIDATION_ADMIN_EMAIL, password: process.env.VALIDATION_ADMIN_PASSWORD }) });
  const login = await loginResponse.json();
  const fixture = await db.query(`select c.id, c.status as client_status, sub.id as subscription_id, sub.status as subscription_status from clients c join subscriptions sub on sub.client_id::uuid = c.id and sub.tenant_id = c.tenant_id where c.tenant_id = $1 and c.type = 'holder' order by c.id limit 1`, [tenantId]);
  if (!fixture.rows[0]) throw new Error('holder with subscription not found');
  const holder = fixture.rows[0];
  const deps = await db.query('select id, status from clients where holder_id::uuid = $1 and tenant_id = $2', [holder.id, tenantId]);
  const result = [];
  try {
    const cancel = await request('POST', `/clients/${holder.id}/cancel-plan`, login.accessToken, { reason: 'Phase 3 external failure validation' });
    const afterCancel = await db.query('select c.status as client_status, sub.status as subscription_status from clients c join subscriptions sub on sub.client_id::uuid = c.id and sub.tenant_id = c.tenant_id where c.id = $1', [holder.id]);
    result.push({ id: 'SUSP-01', status: cancel.status === 201 && afterCancel.rows[0].client_status === 'cancelamento_pendente' && afterCancel.rows[0].subscription_status === 'cancelamento_pendente' ? 'PASSOU' : 'FALHOU', http: cancel.status, expected: 201, db: afterCancel.rows[0], detail: 'external cancellation unavailable leaves pending state' });
    const reactivate = await request('POST', `/clients/${holder.id}/reactivate-plan`, login.accessToken);
    const afterReactivate = await db.query('select c.status as client_status, sub.status as subscription_status from clients c join subscriptions sub on sub.client_id::uuid = c.id and sub.tenant_id = c.tenant_id where c.id = $1', [holder.id]);
    result.push({ id: 'SUSP-02', status: reactivate.status >= 400 && afterReactivate.rows[0].client_status !== 'ativo' && afterReactivate.rows[0].subscription_status !== 'ativa' ? 'PASSOU' : 'FALHOU', http: reactivate.status, expected: 'error without local activation', db: afterReactivate.rows[0], detail: 'reactivation does not activate without external configuration' });
    result.push({ id: 'SUSP-03', status: 'BLOQUEADO', detail: 'valid Sandbox key and real Asaas PUT status transitions were not available' });
  } finally {
    await db.query('update clients set status = $1 where id = $2 and tenant_id = $3', [holder.client_status, holder.id, tenantId]);
    for (const dep of deps.rows) await db.query('update clients set status = $1 where id = $2 and tenant_id = $3', [dep.status, dep.id, tenantId]);
    await db.query('update subscriptions set status = $1 where id = $2 and tenant_id = $3', [holder.subscription_status, holder.subscription_id, tenantId]);
    const output = JSON.stringify(result, null, 2) + '\n';
    fs.writeFileSync(path.join(__dirname, 'suspension-failure-results.json'), output, 'utf8');
    console.log(output);
    await db.end();
  }
}

main().catch((error) => { console.error(`SUSPENSION_FAILURE_FAILED: ${error.message}`); process.exit(1); });
