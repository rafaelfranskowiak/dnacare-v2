const crypto = require('crypto');
const path = require('path');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config({ path: path.join(process.cwd(), '.env') });

const output = process.env.VALIDATION_OUTPUT || path.join('..', '..', 'validation-artifacts', 'phase3-1', 'preflight.json');
const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
const safeError = (error) => ({ code: error.code || null, message: String(error.message || error).replace(/\s+/g, ' ').slice(0, 240) });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = { generatedAt: new Date().toISOString(), database: {}, counts: {}, duplicates: {}, schema: {}, recurrence: {} };
  try {
    const db = await client.query('SELECT current_database() AS database, current_user AS username, version() AS version');
    result.database = { database: db.rows[0].database, username: db.rows[0].username, version: db.rows[0].version.split(',')[0] };
    const tables = ['tenants','users','tenant_users','teams','plans','plan_versions','opportunities','opportunity_dependents','sales','clients','subscriptions','webhook_events'];
    for (const table of tables) {
      try {
        const q = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
        result.counts[table] = q.rows[0].count;
      } catch (error) { result.counts[table] = safeError(error); }
    }
    const duplicateQueries = {
      tenantUsers: ['tenant_users', 'tenant_id, user_id'],
      sales: ['sales', 'tenant_id, opportunity_id'],
      holderClients: ['clients', "tenant_id, opportunity_id", "type = 'holder'"],
      subscriptions: ['subscriptions', 'tenant_id, sale_id'],
      planVersions: ['plan_versions', 'plan_id, version'],
      dependents: ['opportunity_dependents', 'opportunity_id, document_normalized'],
    };
    for (const [name, [table, key, where]] of Object.entries(duplicateQueries)) {
      try {
        const q = await client.query(`SELECT ${key}, COUNT(*)::int AS count FROM "${table}" ${where ? `WHERE ${where}` : ''} GROUP BY ${key} HAVING COUNT(*) > 1 ORDER BY count DESC`);
        const groups = [];
        for (const row of q.rows) {
          const keyValue = key.split(', ').map((column) => row[column]).join('|');
          let distinctSignatures = null;
          if (name === 'tenantUsers') {
            const detail = await client.query('SELECT role_id, team_id, role, status FROM tenant_users WHERE tenant_id = $1 AND user_id = $2', [row.tenant_id, row.user_id]);
            distinctSignatures = new Set(detail.rows.map((r) => JSON.stringify([r.role_id, r.team_id, r.role, r.status]))).size;
          }
          groups.push({ keyHash: hash(keyValue), count: row.count, distinctSignatures });
        }
        result.duplicates[name] = { groupCount: groups.length, groups };
      } catch (error) { result.duplicates[name] = { error: safeError(error) }; }
    }
    const columns = await client.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('subscriptions','tenant_users') ORDER BY table_name, ordinal_position`);
    result.schema.columns = columns.rows;
    const indexes = await client.query(`SELECT tablename AS table_name, indexname AS index_name FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('UQ_tenant_users_tenant_user','UQ_sales_tenant_opportunity','UQ_clients_holder_tenant_opportunity','UQ_subscriptions_tenant_sale') ORDER BY indexname`);
    result.schema.requiredIndexes = indexes.rows;
    const migration = await client.query(`SELECT name, timestamp FROM migrations ORDER BY timestamp DESC LIMIT 5`).catch((error) => ({ rows: [], error }));
    result.schema.migrations = migration.rows.map((r) => ({ name: r.name, timestamp: r.timestamp }));
    try {
      const q = await client.query(`
        SELECT COUNT(*) FILTER (WHERE s.recurring_value IS DISTINCT FROM GREATEST(0, sale.base_value + sale.dependents_value - sale.discount))::int AS divergent,
               COALESCE(SUM(CASE WHEN s.recurring_value IS DISTINCT FROM GREATEST(0, sale.base_value + sale.dependents_value - sale.discount) THEN ABS(s.recurring_value - GREATEST(0, sale.base_value + sale.dependents_value - sale.discount)) ELSE 0 END), 0)::numeric(12,2) AS absolute_delta,
               COUNT(*) FILTER (WHERE COALESCE(sale.admission_fee, 0) > 0)::int AS sales_with_admission_fee,
               COUNT(*) FILTER (WHERE COALESCE(sale.admission_fee, 0) > 0 AND s.recurring_value = GREATEST(0, sale.base_value + sale.dependents_value - sale.discount + sale.admission_fee))::int AS recurring_includes_admission_fee,
               COUNT(*)::int AS subscriptions
        FROM subscriptions s JOIN sales sale ON sale.id::text = s.sale_id`);
      result.recurrence = q.rows[0];
    } catch (error) { result.recurrence = { error: safeError(error) }; }
    require('fs').writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(result, null, 2));
  } finally { await client.end(); }
}
main().catch((error) => { console.error(JSON.stringify(safeError(error))); process.exit(1); });
