const path = require('path');
require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'pg'));

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const result = await db.query(`
    select
      (select count(*)::int from tenants where asaas_webhook_auth_token = 'phase3-synthetic-webhook-token') as synthetic_token_left,
      (select count(*)::int from webhook_events where asaas_event_id like 'phase3-%') as synthetic_events_left,
      (select count(*)::int from (select tenant_id, user_id from tenant_users group by tenant_id, user_id having count(*) > 1) duplicates) as duplicate_groups,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'subscriptions' and column_name in ('billing_cycle','next_due_date')) as new_subscription_columns,
      (select count(*)::int from migrations where name = 'HardenMvpConstraintsAndSubscriptions1784149200000') as phase3_migration_applied`);
  console.log(JSON.stringify(result.rows[0], null, 2));
  await db.end();
}

main().catch((error) => { console.error(`FINAL_STATE_FAILED: ${error.message}`); process.exit(1); });
