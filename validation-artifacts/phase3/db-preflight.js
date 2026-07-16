const path = require('path');
require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'pg'));
const fs = require('fs');

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  await db.connect();
  const checks = {};
  const duplicateQueries = {
    tenant_users: `select tenant_id, user_id, count(*)::int as count from tenant_users group by tenant_id, user_id having count(*) > 1`,
    sales: `select tenant_id, opportunity_id, count(*)::int as count from sales group by tenant_id, opportunity_id having count(*) > 1`,
    clients_holders: `select tenant_id, opportunity_id, count(*)::int as count from clients where type = 'holder' group by tenant_id, opportunity_id having count(*) > 1`,
    subscriptions: `select tenant_id, sale_id, count(*)::int as count from subscriptions group by tenant_id, sale_id having count(*) > 1`,
  };
  for (const [name, sql] of Object.entries(duplicateQueries)) {
    const result = await db.query(sql);
    checks[name] = { rows: result.rowCount, duplicateGroups: result.rows.map((row) => ({ count: row.count })) };
  }
  const indexes = await db.query(`select indexname from pg_indexes where schemaname = 'public' and indexname in ('UQ_tenant_users_tenant_user','UQ_sales_tenant_opportunity','UQ_clients_holder_tenant_opportunity','UQ_subscriptions_tenant_sale') order by indexname`);
  checks.newIndexes = indexes.rows.map((row) => row.indexname);
  const columns = await db.query(`select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'subscriptions' and column_name in ('billing_cycle','next_due_date') order by column_name`);
  checks.subscriptionColumns = columns.rows;
  const recurring = await db.query(`
    select count(*)::int as subscriptions,
           count(*) filter (where round(recurring_value::numeric, 2) <> round((sale.base_value + sale.dependents_value - sale.discount)::numeric, 2))::int as divergences,
           coalesce(sum(abs(round(recurring_value::numeric, 2) - round((sale.base_value + sale.dependents_value - sale.discount)::numeric, 2))), 0)::numeric(12,2) as absolute_delta
    from subscriptions sub join sales sale on sale.id::text = sub.sale_id and sale.tenant_id = sub.tenant_id`);
  checks.recurring = recurring.rows[0];
  const migration = await db.query(`select name from migrations order by id desc limit 1`);
  checks.lastMigration = migration.rows[0]?.name || null;
  const output = JSON.stringify(checks, null, 2) + '\n';
  fs.writeFileSync(path.join(__dirname, 'db-preflight.json'), output, 'utf8');
  console.log(output);
  await db.end();
}

main().catch((error) => { console.error(`PHASE3_DB_PREFLIGHT_FAILED: ${error.message}`); process.exit(1); });
