const path = require('path');
const fs = require('fs');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config({ path: path.join(process.cwd(), '.env') });
const port = process.env.VALIDATION_PORT || '4017';
const base = `http://127.0.0.1:${port}/api`;
const tenant = 'dnacare-sandbox';
const tenantId = '86c372af-b374-41e3-8399-4c3b152ee0f6';
const output = process.env.VALIDATION_OUTPUT || path.join('..', '..', 'validation-artifacts', 'phase3-1', 'suspension-results.json');

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  const holder = await db.query("SELECT id FROM clients WHERE tenant_id = $1 AND type = 'holder' ORDER BY id LIMIT 1", [tenantId]);
  const result = { generatedAt: new Date().toISOString(), status: 'BLOQUEADO', reason: null };
  if (!holder.rows[0]) { result.reason = 'fixture de titular ausente'; }
  else {
    const before = await db.query('SELECT status FROM clients WHERE id = $1', [holder.rows[0].id]);
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'x-tenant-id': tenant, 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.VALIDATION_ADMIN_EMAIL, password: process.env.VALIDATION_ADMIN_PASSWORD }) });
    const login = await response.json();
    const cancel = await fetch(`${base}/clients/${holder.rows[0].id}/cancel-plan`, { method: 'POST', headers: { 'x-tenant-id': tenant, Authorization: `Bearer ${login.accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'validation only' }) });
    const after = await db.query('SELECT status FROM clients WHERE id = $1', [holder.rows[0].id]);
    result.http = cancel.status;
    result.localStateUnchanged = before.rows[0]?.status === after.rows[0]?.status;
    result.reason = cancel.status === 500 ? 'migração pendente: subscriptions.billing_cycle/next_due_date ausentes' : 'cenário sem configuração Asaas';
    result.status = cancel.status === 400 && result.localStateUnchanged ? 'PASSOU' : 'BLOQUEADO';
  }
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8'); console.log(JSON.stringify(result, null, 2)); await db.end();
}
main().catch((error) => { console.error(String(error.message || error).slice(0, 240)); process.exit(1); });
