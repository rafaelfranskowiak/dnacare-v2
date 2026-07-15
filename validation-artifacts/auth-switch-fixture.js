const path = require('path');
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
const crypto = require('crypto');
const fs = require('fs');

const base = 'http://127.0.0.1:4003/api';
const tenantA = 'dnacare-sandbox';
const tenantB = '00000000-0000-0000-0000-000000000001';

async function request(method, url, token, tenant, body) {
  const response = await fetch(base + url, {
    method,
    headers: { 'x-tenant-id': tenant, Authorization: token ? `Bearer ${token}` : '', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await response.json(); } catch {}
  return { status: response.status, json };
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const admin = await db.query('select id from users where email = $1', [process.env.VALIDATION_ADMIN_EMAIL]);
  if (!admin.rows[0]) throw new Error('admin fixture user not found');
  const linkId = crypto.randomUUID();
  await db.query('insert into tenant_users (id, tenant_id, user_id, role, status) values ($1, $2, $3, $4, $5)', [linkId, tenantB, admin.rows[0].id, 'representante', 'active']);
  try {
    const login = await request('POST', '/auth/login', null, tenantA, { email: process.env.VALIDATION_ADMIN_EMAIL, password: process.env.VALIDATION_ADMIN_PASSWORD });
    const token = login.json?.accessToken;
    const switched = await request('GET', '/auth/me', token, tenantB);
    const globalAction = await request('GET', '/tenants', token, tenantB);
    const crossTenantPatch = await request('PATCH', `/tenant-users/${linkId}`, token, tenantA, { role: 'admin' });
    const results = [
      { id: 'AUTH-06', status: switched.status === 200 && switched.json?.role === 'representante' ? 'PASSOU' : 'FALHOU', http: switched.status, expected: 200, observedRole: switched.json?.role || null },
      { id: 'AUTH-07', status: globalAction.status === 403 ? 'PASSOU' : 'FALHOU', http: globalAction.status, expected: 403, detail: 'admin A becomes representative in B' },
      { id: 'AUTH-10', status: crossTenantPatch.status === 404 ? 'PASSOU' : 'FALHOU', http: crossTenantPatch.status, expected: 404, detail: 'tenant A cannot alter B link' },
    ];
    const output = JSON.stringify(results, null, 2) + '\n';
    fs.writeFileSync(path.join(__dirname, 'auth-switch-fixture-results.json'), output, 'utf8');
    console.log(output);
  } finally {
    await db.query('delete from tenant_users where id = $1', [linkId]);
    await db.end();
  }
}

main().catch((error) => { console.error(`AUTH_FIXTURE_FAILED: ${error.message}`); process.exit(1); });
