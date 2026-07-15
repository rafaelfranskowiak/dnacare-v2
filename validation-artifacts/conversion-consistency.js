const path = require('path');
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
const { calculatePricing } = require(path.join(__dirname, '..', 'backend', 'dist', 'src', 'modules', 'plans', 'pricing-engine'));
const { SubscriptionService } = require(path.join(__dirname, '..', 'backend', 'dist', 'src', 'modules', 'subscriptions', 'subscription.service'));
const fs = require('fs');

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const consistency = await db.query(`
    with confirmed as (
      select s.id, s.opportunity_id, s.tenant_id, s.dependent_count,
             s.base_value, s.dependents_value, s.discount, s.admission_fee,
             s.total_value, sub.id as subscription_id,
             sub.recurring_value, o.status as opportunity_status,
             count(c.id) filter (where c.type = 'holder') as holders,
             count(c.id) filter (where c.type <> 'holder') as dependents
      from sales s
      left join subscriptions sub on sub.sale_id::uuid = s.id and sub.tenant_id = s.tenant_id
      left join opportunities o on o.id = s.opportunity_id::uuid and o.tenant_id = s.tenant_id
      left join clients c on c.opportunity_id::uuid = s.opportunity_id::uuid and c.tenant_id = s.tenant_id
      where s.status = 'confirmed'
      group by s.id, sub.id, o.status
    )
    select count(*)::int as confirmed_sales,
           count(*) filter (where opportunity_status = 'convertida')::int as confirmed_with_converted_opportunity,
           count(*) filter (where subscription_id is not null)::int as confirmed_with_subscription,
           count(*) filter (where holders = 1)::int as confirmed_with_one_holder,
           count(*) filter (where dependents = dependent_count)::int as dependent_count_matches,
           count(*) filter (where recurring_value = base_value + dependents_value - discount)::int as recurring_value_matches,
           count(*) filter (where admission_fee is not null and recurring_value = total_value)::int as admission_fee_in_recurring_value
    from confirmed`);
  const totals = await db.query(`
    select
      (select count(*)::int from opportunities where status = 'convertida') as converted_opportunities,
      (select count(*)::int from clients where type = 'holder') as holders,
      (select count(*)::int from clients where type <> 'holder') as dependents,
      (select count(*)::int from subscriptions) as subscriptions`);
  const paymentTable = await db.query("select to_regclass('public.payments') as table_name");
  const saleChecks = await db.query(`
    select s.base_value, s.dependents_value, s.discount, s.admission_fee, s.total_value,
           s.dependent_count, sub.recurring_value,
           round((s.base_value + s.dependents_value - s.discount)::numeric, 2) as expected_recurring,
           round((sub.recurring_value - (s.base_value + s.dependents_value - s.discount))::numeric, 2) as recurring_delta
    from sales s join subscriptions sub on sub.sale_id::uuid = s.id and sub.tenant_id = s.tenant_id
    where s.status = 'confirmed' order by s.total_value`);
  const duplicates = await db.query(`
    select 'tenant_users' as entity, count(*)::int as duplicate_groups from (select tenant_id, user_id from tenant_users group by tenant_id, user_id having count(*) > 1) x
    union all select 'sales', count(*)::int from (select tenant_id, opportunity_id from sales group by tenant_id, opportunity_id having count(*) > 1) x
    union all select 'clients', count(*)::int from (select tenant_id, opportunity_id, document_normalized from clients group by tenant_id, opportunity_id, document_normalized having count(*) > 1) x
    union all select 'subscriptions', count(*)::int from (select tenant_id, sale_id from subscriptions group by tenant_id, sale_id having count(*) > 1) x
    union all select 'webhook_events', count(*)::int from (select asaas_event_id from webhook_events group by asaas_event_id having count(*) > 1) x`);
  const pricingCases = [
    { name: 'admission-excluded-from-recurring', input: { baseValue: 100, dependentRule: 'fixed', includedDependents: 0, dependentValue: 25, tiers: null, admissionFee: 50, discount: 10, dependentCount: 2 }, expected: { total: 190, recurring: 140 } },
    { name: 'progressive-included-dependents', input: { baseValue: 100, dependentRule: 'progressive', includedDependents: 2, dependentValue: 20, tiers: null, admissionFee: 0, discount: 0, dependentCount: 4 }, expected: { total: 160 } },
    { name: 'tiered', input: { baseValue: 100, dependentRule: 'tiered', includedDependents: 0, dependentValue: 50, tiers: [{ min: 1, max: 2, value: 50 }, { min: 3, max: 4, value: 40 }], admissionFee: 0, discount: 0, dependentCount: 3 }, expected: { total: 240 } },
  ].map((test) => ({ name: test.name, result: calculatePricing(test.input), expected: test.expected }));
  const fakeService = new SubscriptionService({}, {});
  const dates = ['2025-01-29', '2025-01-30', '2025-01-31'].map((date) => ({ date, next: fakeService.addCycle(date, 'MONTHLY') }));
  const output = JSON.stringify({ consistency: consistency.rows[0], totals: totals.rows[0], paymentsTable: paymentTable.rows[0].table_name, saleChecks: saleChecks.rows, duplicates: duplicates.rows, pricingCases, monthEndCases: dates, nextDueDatePersisted: false }, null, 2) + '\n';
  fs.writeFileSync(path.join(__dirname, 'conversion-consistency-results.json'), output, 'utf8');
  console.log(output);
  await db.end();
}

main().catch((error) => { console.error(`CONVERSION_VALIDATION_FAILED: ${error.message}`); process.exit(1); });
