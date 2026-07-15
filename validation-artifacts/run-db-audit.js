const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));

const targets = ['tenant_users', 'tenants', 'users', 'teams', 'opportunities', 'sales', 'clients', 'subscriptions', 'webhook_events', 'document_registry'];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  await client.connect();
  const server = await client.query("select current_database() as database, current_user as user, version() as version, inet_server_port() as port");
  const columns = await client.query(`
    select table_name, column_name, data_type, udt_name, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = any($1::text[])
    order by table_name, ordinal_position`, [targets]);
  const indexes = await client.query(`
    select tablename, indexname, indexdef
    from pg_indexes
    where schemaname = 'public' and tablename = any($1::text[])
    order by tablename, indexname`, [targets]);
  const constraints = await client.query(`
    select tc.table_name, tc.constraint_name, tc.constraint_type,
           kcu.column_name, ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name
    from information_schema.table_constraints tc
    left join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    left join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.table_schema = 'public' and tc.table_name = any($1::text[])
      and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
    order by tc.table_name, tc.constraint_name, kcu.ordinal_position`, [targets]);
  const migrationsTable = await client.query(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'migrations'
    order by ordinal_position`);
  const migrations = migrationsTable.rows.length
    ? await client.query(`select * from migrations order by id`)
    : { rows: [] };
  const counts = await client.query(`
    select 'tenants' as table_name, count(*)::int as count from tenants
    union all select 'users', count(*)::int from users
    union all select 'tenant_users', count(*)::int from tenant_users
    union all select 'teams', count(*)::int from teams
    union all select 'opportunities', count(*)::int from opportunities
    union all select 'sales', count(*)::int from sales
    union all select 'clients', count(*)::int from clients
    union all select 'subscriptions', count(*)::int from subscriptions
    union all select 'webhook_events', count(*)::int from webhook_events
    union all select 'document_registry', count(*)::int from document_registry
    order by table_name`);
  const statuses = await client.query(`
    select 'opportunities' as table_name, status, count(*)::int as count from opportunities group by status
    union all select 'sales', status, count(*)::int from sales group by status
    union all select 'subscriptions', status, count(*)::int from subscriptions group by status
    union all select 'webhook_events', status, count(*)::int from webhook_events group by status
    order by table_name, status`);
  const tenantConfig = await client.query(`
    select id, slug, asaas_sandbox, (asaas_api_key is not null and length(asaas_api_key) > 0) as has_api_key,
           (asaas_webhook_auth_token is not null and length(asaas_webhook_auth_token) > 0) as has_webhook_token
    from tenants order by slug`);
  const result = {
    server: { database: server.rows[0].database, user: server.rows[0].user, port: server.rows[0].port, version: server.rows[0].version.split(' on ')[0] },
    columns: columns.rows,
    indexes: indexes.rows,
    constraints: constraints.rows,
    migrations: { columns: migrationsTable.rows.map((r) => r.column_name), rows: migrations.rows },
    counts: counts.rows,
    statuses: statuses.rows,
    tenantConfig: tenantConfig.rows.map((r) => ({ ...r, id: '[uuid]' })),
  };
  const output = JSON.stringify(result, null, 2);
  fs.writeFileSync(path.join(__dirname, 'db-audit.json'), output + '\n', 'utf8');
  console.log(output);
  await client.end();
}

main().catch((error) => {
  console.error(`DB_AUDIT_FAILED: ${error.message}`);
  process.exit(1);
});
