const bcrypt = require('bcrypt');
const { AppDataSource } = require('../src/database/datasource');

async function main() {
  const ds = await AppDataSource.initialize();
  const hash = await bcrypt.hash('niver123', 10);

  const tenants = await ds.query("SELECT id, slug FROM tenants WHERE slug = $1", ['unidade-sp']);
  const tid = tenants[0]?.id;
  if (!tid) { console.log('Tenant nao encontrado'); process.exit(1); }

  await ds.query(
    "INSERT INTO users (email, password, name, tenant_id, active, is_platform_admin) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET password = $2, tenant_id = $4, active = $5",
    ['rafael@wizer.digital', hash, 'Rafael', tid, true, false]
  );

  const users = await ds.query("SELECT id FROM users WHERE email = $1", ['rafael@wizer.digital']);
  const uid = users[0]?.id;

  await ds.query(
    "INSERT INTO tenant_users (tenant_id, user_id, role_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
    [tid, uid, 'admin', 'active']
  );

  console.log('OK: rafael@wizer.digital / niver123 -> tenant unidade-sp (admin)');
  await ds.destroy();
}
main().catch(e => { console.error(e); process.exit(1); });
