const path = require('path');
const fs = require('fs');
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config({ path: path.join(process.cwd(), '.env') });

const output = process.env.VALIDATION_OUTPUT || path.join('..', '..', 'validation-artifacts', 'phase3-1', 'constraint-tests.json');
const safe = (error) => ({ code: error.code || null, message: String(error.message || error).replace(/\s+/g, ' ').slice(0, 180) });

async function attempt(client, name, sql, expected) {
  await client.query(`SAVEPOINT ${name}`);
  try {
    await client.query(sql);
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    return { name, expected, result: 'allowed', passed: expected === 'allowed' };
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    return { name, expected, result: 'rejected', error: safe(error), passed: expected === 'rejected' };
  } finally { await client.query(`RELEASE SAVEPOINT ${name}`); }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = { generatedAt: new Date().toISOString(), migrationPrerequisite: 'not applied', tests: [] };
  try {
    await client.query('BEGIN');
    result.tests.push(await attempt(client, 'tenant_users_duplicate', `
      INSERT INTO tenant_users (tenant_id, user_id, role_id, status, team_id, role)
      SELECT tenant_id, user_id, role_id, status, team_id, role FROM tenant_users LIMIT 1`, 'rejected'));
    result.tests.push(await attempt(client, 'sales_duplicate', `
      INSERT INTO sales (tenant_id, opportunity_id, seller_id, team_id, plan_id, plan_version_id, plan_snapshot,
        dependent_count, total_lives, base_value, dependents_value, admission_fee, subtotal, discount, total_value,
        calculation_memory, payment_method, status, asaas_customer_id, asaas_payment_id, asaas_checkout_url, asaas_bankslip_url)
      SELECT tenant_id, opportunity_id, seller_id, team_id, plan_id, plan_version_id, plan_snapshot,
        dependent_count, total_lives, base_value, dependents_value, admission_fee, subtotal, discount, total_value,
        calculation_memory, payment_method, status, asaas_customer_id, asaas_payment_id, asaas_checkout_url, asaas_bankslip_url
      FROM sales LIMIT 1`, 'rejected'));
    result.tests.push(await attempt(client, 'holder_duplicate', `
      INSERT INTO clients (tenant_id, opportunity_id, seller_id, type, holder_id, name, document, document_normalized,
        phone, email, birth_date, postal_code, address, address_number, address_complement, neighborhood, city, state,
        status, asaas_customer_id)
      SELECT tenant_id, opportunity_id, seller_id, type, holder_id, name, document, document_normalized,
        phone, email, birth_date, postal_code, address, address_number, address_complement, neighborhood, city, state,
        status, asaas_customer_id FROM clients WHERE type = 'holder' LIMIT 1`, 'rejected'));
    result.tests.push(await attempt(client, 'subscription_duplicate', `
      INSERT INTO subscriptions (tenant_id, client_id, sale_id, plan_id, plan_version_id, plan_name, recurring_value,
        dependent_rule, dependent_count, status, start_date, cancel_reason, cancelled_by_id, cancelled_at, asaas_subscription_id)
      SELECT tenant_id, client_id, sale_id, plan_id, plan_version_id, plan_name, recurring_value,
        dependent_rule, dependent_count, status, start_date, cancel_reason, cancelled_by_id, cancelled_at, asaas_subscription_id
      FROM subscriptions LIMIT 1`, 'rejected'));
    result.tests.push(await attempt(client, 'dependent_distinct_allowed', `
      INSERT INTO opportunity_dependents (opportunity_id, name, document, document_normalized)
      SELECT opportunity_id, 'Validation Dependent', '00000000000000', '00000000000000'
      FROM opportunity_dependents LIMIT 1`, 'allowed'));
    await client.query('ROLLBACK');
    result.passed = result.tests.every((test) => test.passed);
  } finally { await client.end(); }
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
}
main().catch((error) => { console.error(JSON.stringify(safe(error))); process.exit(1); });
