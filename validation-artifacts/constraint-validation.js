const path = require('path');
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
const fs = require('fs');

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const rows = await db.query(`select tablename, indexdef from pg_indexes where schemaname = 'public' and tablename in ('tenant_users','sales','clients','subscriptions','webhook_events','payments')`);
  const defs = rows.rows.map((row) => row.indexdef);
  const required = [
    ['tenant_users (tenant_id, user_id)', defs.some((d) => /tenant_users.*\(tenant_id, user_id\)/.test(d))],
    ['sales (tenant_id, opportunity_id)', defs.some((d) => /sales.*\(tenant_id, opportunity_id\)/.test(d))],
    ['clients (tenant_id, opportunity_id)', defs.some((d) => /clients.*\(tenant_id, opportunity_id\)/.test(d))],
    ['subscriptions (tenant_id, sale_id)', defs.some((d) => /subscriptions.*\(tenant_id, sale_id\)/.test(d))],
    ['payments (tenant_id, asaas_payment_id)', defs.some((d) => /payments.*\(tenant_id, asaas_payment_id\)/.test(d))],
    ['webhook_events (asaas_event_id)', defs.some((d) => /webhook_events.*\(asaas_event_id\)/.test(d))],
  ].map(([key, present]) => ({ key, present, status: present ? 'PASSOU' : 'FALHOU' }));
  const output = JSON.stringify({ required, observedIndexCount: rows.rowCount, note: 'absence of a required uniqueness constraint is a production blocker for concurrent idempotency' }, null, 2) + '\n';
  fs.writeFileSync(path.join(__dirname, 'constraint-validation-results.json'), output, 'utf8');
  console.log(output);
  await db.end();
}

main().catch((error) => { console.error(`CONSTRAINT_VALIDATION_FAILED: ${error.message}`); process.exit(1); });
