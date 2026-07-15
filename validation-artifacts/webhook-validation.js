const path = require('path');
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
const fs = require('fs');

const base = 'http://127.0.0.1:4003/api';
const tenantId = '86c372af-b374-41e3-8399-4c3b152ee0f6';
const token = 'validation-only-synthetic-webhook-token';
const ids = {
  unsupported: 'validation-unsupported-001',
  failed: 'validation-failed-001',
  confirmed: 'validation-confirmed-001',
  received: 'validation-received-001',
};

async function send(eventTenant, headerToken, payload) {
  const response = await fetch(`${base}/webhooks/asaas/${eventTenant}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headerToken !== undefined ? { 'asaas-access-token': headerToken } : {}) },
    body: JSON.stringify(payload),
  });
  let json = null;
  try { json = await response.json(); } catch {}
  const serialized = JSON.stringify(json || '');
  return { status: response.status, responseContainsToken: serialized.includes(token), json };
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const current = await db.query('select asaas_webhook_auth_token from tenants where id = $1', [tenantId]);
  if (!current.rows[0]) throw new Error('sandbox tenant not found');
  const original = current.rows[0].asaas_webhook_auth_token;
  const results = [];
  try {
    await db.query('update tenants set asaas_webhook_auth_token = $1 where id = $2', [token, tenantId]);
    const nonexistent = await send('00000000-0000-0000-0000-000000000099', token, { id: ids.unsupported, event: 'UNSUPPORTED_EVENT' });
    results.push({ id: 'WH-01', status: nonexistent.status === 401 ? 'PASSOU' : 'FALHOU', http: nonexistent.status, expected: 401 });
    const missing = await send(tenantId, undefined, { id: ids.unsupported, event: 'UNSUPPORTED_EVENT' });
    results.push({ id: 'WH-02', status: missing.status === 401 ? 'PASSOU' : 'FALHOU', http: missing.status, expected: 401 });
    const invalid = await send(tenantId, 'wrong-token', { id: ids.unsupported, event: 'UNSUPPORTED_EVENT' });
    results.push({ id: 'WH-03', status: invalid.status === 401 ? 'PASSOU' : 'FALHOU', http: invalid.status, expected: 401 });
    const invalidPayload = await send(tenantId, token, {});
    results.push({ id: 'WH-04', status: invalidPayload.status === 400 ? 'PASSOU' : 'FALHOU', http: invalidPayload.status, expected: 400 });
    const unsupported = await send(tenantId, token, { id: ids.unsupported, event: 'UNSUPPORTED_EVENT' });
    results.push({ id: 'WH-05', status: unsupported.status === 200 ? 'PASSOU' : 'FALHOU', http: unsupported.status, expected: 200, responseContainsToken: unsupported.responseContainsToken });
    const duplicate = await send(tenantId, token, { id: ids.unsupported, event: 'UNSUPPORTED_EVENT' });
    const duplicateRow = await db.query('select count(*)::int as count, min(status) as status from webhook_events where asaas_event_id = $1', [ids.unsupported]);
    results.push({ id: 'WH-06', status: duplicate.status === 200 && duplicateRow.rows[0].count === 1 && duplicateRow.rows[0].status === 'processed' ? 'PASSOU' : 'FALHOU', http: duplicate.status, expected: 200, db: duplicateRow.rows[0] });
    const concurrent = await Promise.all([
      send(tenantId, token, { id: 'validation-concurrent-001', event: 'UNSUPPORTED_EVENT' }),
      send(tenantId, token, { id: 'validation-concurrent-001', event: 'UNSUPPORTED_EVENT' }),
    ]);
    const concurrentRow = await db.query('select count(*)::int as count, min(status) as status from webhook_events where asaas_event_id = $1', ['validation-concurrent-001']);
    results.push({ id: 'WH-06-CONCURRENT', status: concurrent.every((item) => item.status === 200) && concurrentRow.rows[0].count === 1 ? 'PASSOU' : 'FALHOU', http: concurrent.map((item) => item.status), expected: [200, 200], db: concurrentRow.rows[0] });
    const failed = await send(tenantId, token, { id: ids.failed, event: 'PAYMENT_CONFIRMED', payment: { id: 'validation-payment-missing' } });
    const retried = await send(tenantId, token, { id: ids.failed, event: 'PAYMENT_CONFIRMED', payment: { id: 'validation-payment-missing' } });
    const failedRow = await db.query('select count(*)::int as count, min(status) as status from webhook_events where asaas_event_id = $1', [ids.failed]);
    results.push({ id: 'WH-07', status: failed.status === 500 && retried.status === 500 && failedRow.rows[0].count === 1 && failedRow.rows[0].status === 'failed' ? 'PASSOU' : 'FALHOU', firstHttp: failed.status, retryHttp: retried.status, expected: '500/500', db: failedRow.rows[0] });
    const confirmed = await send(tenantId, token, { id: ids.confirmed, event: 'PAYMENT_CONFIRMED', payment: { id: 'validation-payment-not-found' } });
    const confirmedRow = await db.query('select status from webhook_events where asaas_event_id = $1', [ids.confirmed]);
    results.push({ id: 'WH-08', status: confirmed.status === 500 && confirmedRow.rows[0]?.status === 'failed' ? 'PASSOU' : 'FALHOU', http: confirmed.status, expected: 500, dbStatus: confirmedRow.rows[0]?.status || null, note: 'payload intentionally references no local sale' });
    const received = await send(tenantId, token, { id: ids.received, event: 'PAYMENT_RECEIVED', payment: { id: 'validation-payment-received' } });
    const receivedRow = await db.query('select status from webhook_events where asaas_event_id = $1', [ids.received]);
    results.push({ id: 'WH-09', status: received.status === 200 && receivedRow.rows[0]?.status === 'processed' ? 'PASSOU' : 'FALHOU', http: received.status, expected: 200, dbStatus: receivedRow.rows[0]?.status || null });
    results.push({ id: 'WH-10', status: unsupported.status === 200 ? 'PASSOU' : 'FALHOU', http: unsupported.status, expected: 200, note: 'unsupported event is accepted and marked processed' });
    const output = JSON.stringify(results, null, 2) + '\n';
    fs.writeFileSync(path.join(__dirname, 'webhook-validation-results.json'), output, 'utf8');
    console.log(output);
  } finally {
    await db.query('update tenants set asaas_webhook_auth_token = $1 where id = $2', [original, tenantId]);
    await db.query('delete from webhook_events where asaas_event_id = any($1::text[])', [[...Object.values(ids), 'validation-concurrent-001']]);
    await db.end();
  }
}

main().catch((error) => { console.error(`WEBHOOK_VALIDATION_FAILED: ${error.message}`); process.exit(1); });
