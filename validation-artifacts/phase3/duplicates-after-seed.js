const path = require('path');
require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'pg'));
const crypto = require('crypto');
const fs = require('fs');

function mask(value) { return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12); }

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const queries = {
    tenant_users: `select tenant_id, user_id, count(*)::int as count from tenant_users group by tenant_id, user_id having count(*) > 1`,
    sales: `select tenant_id, opportunity_id, count(*)::int as count from sales group by tenant_id, opportunity_id having count(*) > 1`,
    clients_holders: `select tenant_id, opportunity_id, count(*)::int as count from clients where type = 'holder' group by tenant_id, opportunity_id having count(*) > 1`,
    subscriptions: `select tenant_id, sale_id, count(*)::int as count from subscriptions group by tenant_id, sale_id having count(*) > 1`,
  };
  const result = {};
  for (const [name, sql] of Object.entries(queries)) {
    const rows = (await db.query(sql)).rows;
    result[name] = rows.map((row) => ({ keyHash: mask(`${row.tenant_id}:${row.user_id || row.opportunity_id || row.sale_id}`), count: row.count }));
  }
  const migration = await db.query('select name from migrations order by id desc limit 2');
  result.lastMigrations = migration.rows;
  result.newIndexes = (await db.query(`select indexname from pg_indexes where schemaname = 'public' and indexname like 'UQ_%' order by indexname`)).rows.map((r) => r.indexname);
  result.subscriptionColumns = (await db.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'subscriptions' and column_name in ('billing_cycle','next_due_date') order by column_name`)).rows.map((r) => r.column_name);
  const output = JSON.stringify(result, null, 2) + '\n';
  fs.writeFileSync(path.join(__dirname, 'duplicates-after-seed.json'), output, 'utf8');
  console.log(output);
  await db.end();
}

main().catch((error) => { console.error(`DUPLICATE_SCAN_FAILED: ${error.message}`); process.exit(1); });
