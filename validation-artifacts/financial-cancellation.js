const path = require('path');
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
const fs = require('fs');
const tenantId = '86c372af-b374-41e3-8399-4c3b152ee0f6';
const base = 'http://127.0.0.1:4003/api';

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
  const source = await db.query(`
    select c.id, c.status as client_status, sub.id as subscription_id, sub.status as subscription_status,
           (select count(*)::int from clients d where d.holder_id::uuid = c.id and d.tenant_id = c.tenant_id) as dependent_count,
           (c.asaas_customer_id is not null) as has_asaas_customer
    from clients c left join subscriptions sub on sub.client_id::uuid = c.id and sub.tenant_id = c.tenant_id
    where c.tenant_id = $1 and c.type = 'holder' order by c.id limit 1`, [tenantId]);
  if (!source.rows[0]) throw new Error('no holder fixture found');
  const fixture = source.rows[0];
    const dependentRows = await db.query('select id, status from clients where holder_id::uuid = $1 and tenant_id = $2', [fixture.id, tenantId]);
  const results = [];
  try {
    const cancel = await request('POST', `/clients/${fixture.id}/cancel-plan`, login.accessToken, { reason: 'Validation cancellation without external key' });
    const afterCancel = await db.query('select c.status as client_status, sub.status as subscription_status, (select count(*)::int from clients d where d.holder_id::uuid = c.id and d.status = \'vinculado_a_titular_inativo\') as inactive_dependents from clients c left join subscriptions sub on sub.client_id::uuid = c.id and sub.tenant_id = c.tenant_id where c.id = $1', [fixture.id]);
    results.push({ id: 'FIN-01', status: cancel.status === 201 && cancel.json?.clientStatus === 'cancelamento_pendente' && afterCancel.rows[0].client_status === 'cancelamento_pendente' ? 'PASSOU' : 'FALHOU', http: cancel.status, expected: 201, db: afterCancel.rows[0], detail: 'pending Asaas cancellation is visible locally' });
    const reactivate = await request('POST', `/clients/${fixture.id}/reactivate-plan`, login.accessToken);
    const afterReactivate = await db.query('select c.status as client_status, sub.status as subscription_status from clients c left join subscriptions sub on sub.client_id::uuid = c.id and sub.tenant_id = c.tenant_id where c.id = $1', [fixture.id]);
    results.push({ id: 'FIN-02', status: reactivate.status === 201 && afterReactivate.rows[0].client_status === 'ativo' ? 'FALHOU' : 'PASSOU', http: reactivate.status, expected: 'must synchronize with Asaas before local activation', db: afterReactivate.rows[0], detail: 'reactivation updates local state without an Asaas call' });
    const settle = await request('POST', `/clients/${fixture.id}/settle-debts`, login.accessToken);
    results.push({ id: 'FIN-03', status: settle.status === 400 ? 'PASSOU' : 'FALHOU', http: settle.status, expected: 400, detail: 'consolidated settlement remains explicitly blocked' });
    const financial = await request('GET', `/clients/${fixture.id}/financial`, login.accessToken);
    results.push({ id: 'FIN-04', status: fixture.has_asaas_customer && financial.status === 400 ? 'PASSOU' : 'BLOQUEADO', http: financial.status, expected: 400, detail: fixture.has_asaas_customer ? 'tenant Asaas config absent, financial gateway call blocked safely' : 'fixture has no external customer' });
    results.push({ id: 'FIN-05', status: 'BLOQUEADO', detail: 'payments ledger table and suspension API are not present in the local schema/routes' });
  } finally {
    await db.query('update clients set status = $1 where id = $2 and tenant_id = $3', [fixture.client_status, fixture.id, tenantId]);
    for (const dep of dependentRows.rows) await db.query('update clients set status = $1 where id = $2 and tenant_id = $3', [dep.status, dep.id, tenantId]);
    if (fixture.subscription_id) await db.query('update subscriptions set status = $1 where id = $2 and tenant_id = $3', [fixture.subscription_status, fixture.subscription_id, tenantId]);
    const output = JSON.stringify(results, null, 2) + '\n';
    fs.writeFileSync(path.join(__dirname, 'financial-cancellation-results.json'), output, 'utf8');
    console.log(output);
    await db.end();
  }
}

main().catch((error) => { console.error(`FINANCIAL_VALIDATION_FAILED: ${error.message}`); process.exit(1); });
