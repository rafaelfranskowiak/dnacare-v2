import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { AppDataSource } from '../../src/database/datasource';
import { calculatePricing, PricingInput } from '../../src/modules/plans/pricing-engine';
import { normalizeDocument } from '../../src/modules/opportunities/document-normalizer';

// ── Config ──────────────────────────────────────────────────────────
const TENANT_ID = '86c372af-b374-41e3-8399-4c3b152ee0f6';
const ASAAS_API_KEY = process.env.ASAAS_SANDBOX_API_KEY?.trim();
const ASAAS_BASE = (
  process.env.ASAAS_SANDBOX_BASE_URL?.trim() || 'https://api-sandbox.asaas.com'
).replace(/\/+$/, '');
const ALLOW_POPULATED_SANDBOX_SEED =
  process.env.ALLOW_POPULATED_SANDBOX_SEED?.trim().toLowerCase() === 'true';

function stableUuid(input: string): string {
  const hex = createHash('sha256').update(input).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function getValidatedSeedConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = ASAAS_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ASAAS_SANDBOX_API_KEY não definida. O seed foi interrompido antes de acessar ou alterar o banco.',
    );
  }

  let parsedBase: URL;
  try {
    parsedBase = new URL(ASAAS_BASE);
  } catch {
    throw new Error('ASAAS_SANDBOX_BASE_URL inválida.');
  }

  const isOfficialSandbox =
    parsedBase.protocol === 'https:' &&
    parsedBase.hostname === 'api-sandbox.asaas.com' &&
    (parsedBase.pathname === '/' || parsedBase.pathname === '');

  if (!isOfficialSandbox) {
    throw new Error(
      'O seed aceita exclusivamente https://api-sandbox.asaas.com. URLs de produção, proxy ou ambiente desconhecido foram bloqueadas.',
    );
  }

  return { apiKey, baseUrl: ASAAS_BASE };
}

// ── Asaas helper ────────────────────────────────────────────────────
async function asaas(method: string, path: string, body?: Record<string, any>) {
  const { apiKey, baseUrl } = getValidatedSeedConfig();

  const url = `${baseUrl}/v3${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': process.env.ASAAS_USER_AGENT || 'DNACare-Seed/0.1.0',
      access_token: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const msgs = (data as any)?.errors?.map((e: any) => e.description).join(', ') || JSON.stringify(data);
    throw new Error(`Asaas ${method} ${path}: ${res.status} — ${msgs}`);
  }
  return data;
}

// ── Main ────────────────────────────────────────────────────────────
async function populate() {
  getValidatedSeedConfig();

  const ds = await AppDataSource.initialize();
  const db = (sql: string, params?: any[]) => ds.query(sql, params);
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  try {
    const [databaseState] = await db(
      `
        SELECT
          EXISTS (
            SELECT 1 FROM tenant_users WHERE tenant_id = $1
          )
          OR EXISTS (
            SELECT 1 FROM opportunities WHERE tenant_id = $1
          )
          OR EXISTS (
            SELECT 1 FROM sales WHERE tenant_id = $1
          )
          OR EXISTS (
            SELECT 1 FROM clients WHERE tenant_id = $1
          )
          OR EXISTS (
            SELECT 1 FROM subscriptions WHERE tenant_id = $1
          ) AS populated
      `,
      [TENANT_ID],
    );

    if (databaseState?.populated && !ALLOW_POPULATED_SANDBOX_SEED) {
      throw new Error(
        'O banco Sandbox já possui dados para o tenant do seed. Faça backup e defina ALLOW_POPULATED_SANDBOX_SEED=true somente para uma reexecução deliberada.',
      );
    }

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  POPULATE SANDBOX — Dados Completos     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ──────────────────────────────────────────────────────────────────
  // 1. USUÁRIOS
  // ──────────────────────────────────────────────────────────────────
  console.log('── 1. USUÁRIOS ──');

  const users = [
    { id: '00000000-0000-0000-0000-000000000101', email: 'admin@dnacare.com.br', name: 'Admin Sandbox', password: 'Admin@123', role: 'admin' },
    { id: '00000000-0000-0000-0000-000000000102', email: 'gerente@dnacare.com.br', name: 'Gerente Sandbox', password: 'Gerente@123', role: 'gerente' },
    { id: '00000000-0000-0000-0000-000000000103', email: 'vendedor1@dnacare.com.br', name: 'Vendedor Alpha', password: 'Vendedor@123', role: 'representante' },
    { id: '00000000-0000-0000-0000-000000000104', email: 'vendedor2@dnacare.com.br', name: 'Vendedor Beta', password: 'Vendedor@123', role: 'representante' },
  ];

  for (const u of users) {
    const pwHash = await hash(u.password);
    await db(
      `INSERT INTO users (id, email, password, name, tenant_id, active, is_platform_admin)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO UPDATE SET password=$3, name=$4, tenant_id=$5, active=$6`,
      [u.id, u.email, pwHash, u.name, TENANT_ID, true, false],
    );
    await db(
      `INSERT INTO tenant_users (tenant_id, user_id, role, status)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1
         FROM tenant_users
         WHERE tenant_id = $1 AND user_id = $2
       )`,
      [TENANT_ID, u.id, u.role, 'active'],
    );
    await db(
      `UPDATE tenant_users
       SET role = $3, status = $4
       WHERE tenant_id = $1 AND user_id = $2`,
      [TENANT_ID, u.id, u.role, 'active'],
    );
    console.log(`  ✔ ${u.email} (${u.role})`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. TIMES
  // ──────────────────────────────────────────────────────────────────
  console.log('\n── 2. TIMES ──');

  const teams = [
    { id: '00000000-0000-0000-0000-000000000201', name: 'Equipe Alpha', managerId: users[1].id, memberIds: [users[2].id] },
    { id: '00000000-0000-0000-0000-000000000202', name: 'Equipe Beta', managerId: users[1].id, memberIds: [users[3].id] },
  ];

  for (const t of teams) {
    await db(
      `INSERT INTO teams (id, tenant_id, name, manager_id)
       VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [t.id, TENANT_ID, t.name, t.managerId],
    );
    for (const mid of t.memberIds) {
      await db(`UPDATE tenant_users SET team_id = $1 WHERE tenant_id = $2 AND user_id = $3`, [t.id, TENANT_ID, mid]);
    }
    console.log(`  ✔ ${t.name} (gerente: gerente@dnacare.com.br, ${t.memberIds.length} membro(s))`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. PLANOS (globais — sem tenant)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n── 3. PLANOS ──');

  const plans = [
    {
      id: '00000000-0000-0000-0000-000000000301',
      name: 'Plano Individual Essencial',
      type: 'PF',
      description: 'Cobertura básica individual com opção de dependentes fixos',
      config: { baseValue: 49.9, dependentRule: 'fixed', includedDependents: 0, maxDependents: 3, dependentValue: 29.9, admissionFee: 0 },
    },
    {
      id: '00000000-0000-0000-0000-000000000302',
      name: 'Plano Família Plus',
      type: 'PF',
      description: 'Plano familiar com 2 dependentes inclusos e cobrança progressiva',
      config: { baseValue: 99.9, dependentRule: 'progressive', includedDependents: 2, maxDependents: 5, dependentValue: 49.9, admissionFee: 0 },
    },
    {
      id: '00000000-0000-0000-0000-000000000303',
      name: 'Plano Empresarial',
      type: 'PJ',
      description: 'Plano para empresas com até 10 vidas e precificação por faixa',
      config: {
        baseValue: 149.9,
        dependentRule: 'tiered',
        includedDependents: 0,
        maxDependents: 10,
        dependentValue: 39.9,
        tiersConfig: [
          { min: 1, max: 3, value: 39.9 },
          { min: 4, max: 6, value: 34.9 },
          { min: 7, max: 10, value: 29.9 },
        ],
        admissionFee: 99.9,
      },
    },
  ];

  const planVersionIds: string[] = [];

  for (const p of plans) {
    await db(
      `INSERT INTO plans (id, name, description, type, status, available_for_sale)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, status=$5, available_for_sale=$6`,
      [p.id, p.name, p.description, p.type, 'publicado', true],
    );

    const existingPlanVersions = await db(
      `SELECT id
       FROM plan_versions
       WHERE plan_id = $1 AND version = $2
       ORDER BY created_at ASC, id ASC
       LIMIT 1`,
      [p.id, 1],
    );
    const pvId =
      existingPlanVersions[0]?.id || stableUuid(`sandbox-plan-version:${p.id}:1`);
    planVersionIds.push(pvId);

    await db(
      `INSERT INTO plan_versions (id, plan_id, version, name, base_value, billing_cycle, dependent_rule,
         included_dependents, max_dependents, dependent_value, tiers_config, admission_fee, status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         base_value = EXCLUDED.base_value,
         billing_cycle = EXCLUDED.billing_cycle,
         dependent_rule = EXCLUDED.dependent_rule,
         included_dependents = EXCLUDED.included_dependents,
         max_dependents = EXCLUDED.max_dependents,
         dependent_value = EXCLUDED.dependent_value,
         tiers_config = EXCLUDED.tiers_config,
         admission_fee = EXCLUDED.admission_fee,
         status = EXCLUDED.status,
         published_at = EXCLUDED.published_at`,
      [
        pvId, p.id, 1, `${p.name} v1`, p.config.baseValue, 'MONTHLY',
        p.config.dependentRule, p.config.includedDependents,
        p.config.maxDependents ?? null, p.config.dependentValue ?? null,
        (p.config as any).tiersConfig ? JSON.stringify((p.config as any).tiersConfig) : null,
        p.config.admissionFee ?? null, 'publicado', new Date(),
      ],
    );
    console.log(`  ✔ ${p.name} v1 (R$ ${p.config.baseValue})`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. OPORTUNIDADES + DEPENDENTES
  // ──────────────────────────────────────────────────────────────────
  console.log('\n── 4. OPORTUNIDADES ──');

  interface OppData {
    id: string;
    name: string;
    cpfs: string[];           // [0] = titular, [1..] = dependentes
    depNames: string[];
    sellerId: string;
    teamId: string;
    planVersionIdx: number;   // index into planVersionIds
    phone: string;
    email: string;
    birthDate: string;
    postalCode: string;
    address: string;
    addressNumber: string;
    neighborhood: string;
    city: string;
    state: string;
    paymentMethod: string;
    status: 'aberta' | 'checkout_gerado';  // some will stay open
  }

  const opportunities: OppData[] = [
    {
      id: '00000000-0000-0000-0000-000000000401',
      name: 'João Silva',
      cpfs: ['529.982.247-25'],
      depNames: [],
      sellerId: users[2].id, teamId: teams[0].id,
      planVersionIdx: 0, // Individual Essencial
      phone: '11999888777', email: 'joao.silva@email.com',
      birthDate: '1985-03-15',
      postalCode: '01310100', address: 'Avenida Paulista',
      addressNumber: '1000', neighborhood: 'Bela Vista',
      city: 'São Paulo', state: 'SP',
      paymentMethod: 'BOLETO', status: 'checkout_gerado',
    },
    {
      id: '00000000-0000-0000-0000-000000000402',
      name: 'Maria Santos',
      cpfs: ['714.287.938-60', '077.278.326-10'],
      depNames: ['José Santos'],
      sellerId: users[2].id, teamId: teams[0].id,
      planVersionIdx: 1, // Família Plus
      phone: '21988776655', email: 'maria.santos@email.com',
      birthDate: '1990-07-22',
      postalCode: '22041001', address: 'Rua Barata Ribeiro',
      addressNumber: '500', neighborhood: 'Copacabana',
      city: 'Rio de Janeiro', state: 'RJ',
      paymentMethod: 'BOLETO', status: 'checkout_gerado',
    },
    {
      id: '00000000-0000-0000-0000-000000000403',
      name: 'Pedro Oliveira',
      cpfs: ['861.471.920-51', '346.921.780-08'],
      depNames: ['Carla Oliveira'],
      sellerId: users[3].id, teamId: teams[1].id,
      planVersionIdx: 1, // Família Plus
      phone: '31977665544', email: 'pedro.oliveira@email.com',
      birthDate: '1978-11-30',
      postalCode: '30130005', address: 'Rua da Bahia',
      addressNumber: '1200', neighborhood: 'Centro',
      city: 'Belo Horizonte', state: 'MG',
      paymentMethod: 'BOLETO', status: 'checkout_gerado',
    },
    {
      id: '00000000-0000-0000-0000-000000000404',
      name: 'Tech Solutions Ltda',
      cpfs: ['11.222.333/0001-81'], // CNPJ
      depNames: [],
      sellerId: users[3].id, teamId: teams[1].id,
      planVersionIdx: 2, // Empresarial
      phone: '4133221100', email: 'financeiro@techsolutions.com.br',
      birthDate: '2015-01-20', // fundação da empresa (não relevante, mas campo required)
      postalCode: '80010000', address: 'Rua XV de Novembro',
      addressNumber: '300', neighborhood: 'Centro',
      city: 'Curitiba', state: 'PR',
      paymentMethod: 'BOLETO', status: 'checkout_gerado',
    },
    {
      id: '00000000-0000-0000-0000-000000000405',
      name: 'Ana Costa',
      cpfs: ['159.487.263-00'],
      depNames: [],
      sellerId: users[2].id, teamId: teams[0].id,
      planVersionIdx: 0, // Individual Essencial
      phone: '', email: '', birthDate: '',
      postalCode: '', address: '', addressNumber: '',
      neighborhood: '', city: '', state: '',
      paymentMethod: '', status: 'aberta', // stays open — incomplete
    },
  ];

  for (const o of opportunities) {
    const docNormalized = normalizeDocument(o.cpfs[0]);

    // Register document
    await db(
      `INSERT INTO document_registry (tenant_id, document_normalized, entity_type, entity_id)
       VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, document_normalized) DO NOTHING`,
      [TENANT_ID, docNormalized, 'opportunity', o.id],
    );

    // Create opportunity
    await db(
      `INSERT INTO opportunities (id, tenant_id, seller_id, name, document, document_normalized,
         phone, email, birth_date, postal_code, address, address_number, neighborhood, city, state,
         plan_version_id, payment_method, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         name=$4, phone=$7, email=$8, birth_date=$9, postal_code=$10,
         address=$11, address_number=$12, neighborhood=$13, city=$14, state=$15,
         plan_version_id=$16, payment_method=$17, status=$18`,
      [
        o.id, TENANT_ID, o.sellerId, o.name, o.cpfs[0], docNormalized,
        o.phone || null, o.email || null, o.birthDate || null,
        o.postalCode || null, o.address || null, o.addressNumber || null,
        o.neighborhood || null, o.city || null, o.state || null,
        o.planVersionIdx >= 0 ? planVersionIds[o.planVersionIdx] : null,
        o.paymentMethod || null, o.status,
      ],
    );

    // Create dependents
    for (let i = 1; i < o.cpfs.length; i++) {
      const depDoc = normalizeDocument(o.cpfs[i]);
      const existingDependents = await db(
        `SELECT id
         FROM opportunity_dependents
         WHERE opportunity_id = $1 AND document_normalized = $2
         ORDER BY created_at ASC, id ASC
         LIMIT 1`,
        [o.id, depDoc],
      );
      const depId =
        existingDependents[0]?.id ||
        stableUuid(`sandbox-opportunity-dependent:${o.id}:${depDoc}`);
      await db(
        `INSERT INTO opportunity_dependents (id, opportunity_id, name, document, document_normalized)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           document = EXCLUDED.document,
           document_normalized = EXCLUDED.document_normalized`,
        [depId, o.id, o.depNames[i - 1], o.cpfs[i], depDoc],
      );
    }

    const depLabel = o.cpfs.length > 1 ? ` +${o.cpfs.length - 1} dep(s)` : '';
    console.log(`  ✔ ${o.name} (${o.status})${depLabel}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. GERAR CHECKOUTS (Asaas customer + payment + sale)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n── 5. GERANDO CHECKOUTS ──');

  const planVersions = await db(`SELECT * FROM plan_versions WHERE id = ANY($1)`, [planVersionIds]);

  // Store sale records for later conversion
  const sales: { id: string; opportunityId: string; asaasPaymentId: string; asaasCustomerId: string; totalValue: number; planId: string; planVersionId: string; dependentCount: number }[] = [];

  for (const o of opportunities.filter((x) => x.status === 'checkout_gerado')) {
    // Skip if sale already exists (idempotent re-run)
    const existing = await db(`SELECT id, asaas_payment_id, asaas_customer_id, total_value, plan_id, plan_version_id, dependent_count, status FROM sales WHERE opportunity_id = $1 AND tenant_id = $2`, [o.id, TENANT_ID]);
    if (existing.length > 0) {
      const s = existing[0];
      console.log(`  ⏭ ${o.name} — sale already exists (${s.id}, status: ${s.status})`);
      sales.push({ id: s.id, opportunityId: o.id, asaasPaymentId: s.asaas_payment_id, asaasCustomerId: s.asaas_customer_id, totalValue: Number(s.total_value), planId: s.plan_id, planVersionId: s.plan_version_id, dependentCount: s.dependent_count });
      continue;
    }

    const pv = planVersions.find((v: any) => v.id === planVersionIds[o.planVersionIdx]);
    const depCount = o.cpfs.length - 1;

    // Calculate pricing
    const pricingInput: PricingInput = {
      baseValue: Number(pv.base_value),
      dependentRule: pv.dependent_rule,
      includedDependents: pv.included_dependents,
      dependentValue: Number(pv.dependent_value || 0),
      tiers: pv.tiers_config || null,
      admissionFee: Number(pv.admission_fee || 0),
      discount: 0,
      dependentCount: depCount,
    };
    const pricing = calculatePricing(pricingInput);

    // Create Asaas customer
    const customerDoc = normalizeDocument(o.cpfs[0]);
    const asaasCustomer = await asaas('POST', '/customers', {
      name: o.name,
      cpfCnpj: customerDoc,
      email: o.email,
      phone: o.phone,
      mobilePhone: o.phone,
      postalCode: o.postalCode,
      address: o.address,
      addressNumber: o.addressNumber,
      province: o.neighborhood,
      externalReference: o.id,
    });
    console.log(`  Asaas customer: ${asaasCustomer.id} → ${o.name}`);

    // Create sale record
    const saleId = randomUUID();
    const planSnapshot = {
      planId: pv.plan_id,
      planVersionId: pv.id,
      planName: pv.name,
      baseValue: Number(pv.base_value),
      dependentRule: pv.dependent_rule,
      includedDependents: pv.included_dependents,
      dependentValue: Number(pv.dependent_value || 0),
      tiersConfig: pv.tiers_config,
      admissionFee: Number(pv.admission_fee || 0),
      billingCycle: pv.billing_cycle || 'MONTHLY',
    };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create Asaas payment (BOLETO)
    const asaasPayment = await asaas('POST', '/payments', {
      customer: asaasCustomer.id,
      billingType: 'BOLETO',
      value: pricing.total,
      dueDate: dueDateStr,
      description: `${pv.name}`,
      externalReference: saleId,
    });
    console.log(`  Asaas payment: ${asaasPayment.id} → R$ ${pricing.total.toFixed(2)}`);

    // Insert sale
    await db(
      `INSERT INTO sales (id, tenant_id, opportunity_id, seller_id, team_id, plan_id, plan_version_id,
         plan_snapshot, dependent_count, total_lives, base_value, dependents_value, admission_fee,
         subtotal, discount, total_value, calculation_memory, payment_method, status,
         asaas_customer_id, asaas_payment_id, asaas_bankslip_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT (id) DO NOTHING`,
      [
        saleId, TENANT_ID, o.id, o.sellerId, o.teamId, pv.plan_id, pv.id,
        JSON.stringify(planSnapshot), depCount, 1 + depCount,
        pricing.baseValue, pricing.dependentsValue, pricing.admissionFee,
        pricing.subtotal, pricing.discount, pricing.total,
        JSON.stringify(JSON.parse(pricing.calculationMemory)), o.paymentMethod, 'pending_payment',
        asaasCustomer.id, asaasPayment.id, asaasPayment.bankSlipUrl || null,
      ],
    );

    // Update opportunity status + asaasCustomerId
    await db(
      `UPDATE opportunities SET status = 'checkout_gerado', asaas_customer_id = $1 WHERE id = $2`,
      [asaasCustomer.id, o.id],
    );

    sales.push({
      id: saleId,
      opportunityId: o.id,
      asaasPaymentId: asaasPayment.id,
      asaasCustomerId: asaasCustomer.id,
      totalValue: pricing.total,
      planId: pv.plan_id,
      planVersionId: pv.id,
      dependentCount: depCount,
    });

    console.log(`  ✔ Sale ${saleId} — R$ ${pricing.total.toFixed(2)} (boleto: ${asaasPayment.bankSlipUrl || 'N/A'})`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 6. CONFIRMAR PAGAMENTOS via Sandbox
  // ──────────────────────────────────────────────────────────────────
  console.log('\n── 6. CONFIRMANDO PAGAMENTOS (sandbox) ──');

  for (const s of sales) {
    const saleRow = (await db(`SELECT status FROM sales WHERE id = $1`, [s.id]))[0];
    if (!saleRow) continue;
    if (saleRow.status === 'confirmed') {
      console.log(`  ⏭ Payment ${s.asaasPaymentId} — already confirmed`);
      continue;
    }
    await asaas('POST', `/sandbox/payment/${s.asaasPaymentId}/confirm`, {});
    console.log(`  ✔ Payment ${s.asaasPaymentId} confirmed`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 7. CONVERTER — Clientes + Assinaturas
  // ──────────────────────────────────────────────────────────────────
  console.log('\n── 7. CONVERTENDO OPORTUNIDADES → CLIENTES ──');

  for (const s of sales) {
    const opp = (await db(`SELECT * FROM opportunities WHERE id = $1`, [s.opportunityId]))[0];

    // Skip if already converted
    const existingClient = await db(`SELECT id FROM clients WHERE opportunity_id = $1 AND tenant_id = $2 AND type = 'holder'`, [s.opportunityId, TENANT_ID]);
    if (existingClient.length > 0) {
      console.log(`  ⏭ ${opp.name} — already converted to client`);
      continue;
    }

    // Update sale status
    await db(`UPDATE sales SET status = 'confirmed' WHERE id = $1`, [s.id]);

    // Update opportunity status
    await db(`UPDATE opportunities SET status = 'convertida' WHERE id = $1`, [s.opportunityId]);

    // Create holder client
    const holderId = randomUUID();
    await db(
      `INSERT INTO clients (id, tenant_id, opportunity_id, seller_id, type, name, document,
         document_normalized, phone, email, birth_date, postal_code, address, address_number,
         neighborhood, city, state, status, asaas_customer_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (tenant_id, document_normalized) DO UPDATE SET status='ativo'`,
      [
        holderId, TENANT_ID, opp.id, opp.seller_id, 'holder', opp.name, opp.document,
        opp.document_normalized, opp.phone, opp.email, opp.birth_date, opp.postal_code,
        opp.address, opp.address_number, opp.neighborhood, opp.city, opp.state,
        'ativo', s.asaasCustomerId,
      ],
    );

    // Create dependent clients from opportunity_dependents
    const deps = await db(`SELECT * FROM opportunity_dependents WHERE opportunity_id = $1`, [s.opportunityId]);
    for (const dep of deps) {
      // Register document
      await db(
        `INSERT INTO document_registry (tenant_id, document_normalized, entity_type, entity_id)
         VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, document_normalized) DO NOTHING`,
        [TENANT_ID, dep.document_normalized, 'client', dep.id],
      );

      const depClientId = randomUUID();
      await db(
        `INSERT INTO clients (id, tenant_id, opportunity_id, seller_id, holder_id, type, name,
           document, document_normalized, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (tenant_id, document_normalized) DO NOTHING`,
        [depClientId, TENANT_ID, opp.id, opp.seller_id, holderId, 'dependent',
          dep.name, dep.document, dep.document_normalized, 'ativo'],
      );
    }

    // Create Asaas subscription
    const startDate = new Date().toISOString().split('T')[0];
    const pv = planVersions.find((v: any) => v.id === s.planVersionId);
    const [saleAmounts] = await db(
      `SELECT base_value, dependents_value, discount
       FROM sales
       WHERE id = $1 AND tenant_id = $2`,
      [s.id, TENANT_ID],
    );
    const recurringValue = Math.max(
      0,
      Number(saleAmounts.base_value || 0)
        + Number(saleAmounts.dependents_value || 0)
        - Number(saleAmounts.discount || 0),
    );
    const billingCycle = pv?.billing_cycle || 'MONTHLY';
    const nextDueDateDate = new Date(`${startDate}T12:00:00.000Z`);
    nextDueDateDate.setUTCMonth(nextDueDateDate.getUTCMonth() + 1);
    const nextDueDate = nextDueDateDate.toISOString().split('T')[0];

    const asaasSub = await asaas('POST', '/subscriptions', {
      customer: s.asaasCustomerId,
      billingType: 'BOLETO',
      value: recurringValue,
      nextDueDate,
      cycle: billingCycle,
      description: pv?.name || 'Assinatura',
      externalReference: s.id,
    });

    // Create subscription record
    const subId = randomUUID();
    await db(
      `INSERT INTO subscriptions (id, tenant_id, client_id, sale_id, plan_id, plan_version_id,
         plan_name, recurring_value, dependent_rule, dependent_count, status, start_date,
         billing_cycle, next_due_date, asaas_subscription_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (tenant_id, client_id) DO NOTHING`,
      [
        subId, TENANT_ID, holderId, s.id, s.planId, s.planVersionId,
        pv?.name || 'Assinatura', recurringValue, pv?.dependent_rule || 'none', s.dependentCount,
        'ativa', startDate, billingCycle, nextDueDate, asaasSub.id,
      ],
    );

    const depLabel = deps.length > 0 ? ` +${deps.length} dep(s)` : '';
    console.log(`  ✔ ${opp.name} → cliente (holder + ${deps.length} deps) | sub: ${asaasSub.id}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 8. RESUMO FINAL
  // ──────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         POPULATE COMPLETO!              ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const [userCount] = await db(`SELECT count(*)::int as c FROM tenant_users WHERE tenant_id = $1`, [TENANT_ID]);
  const [teamCount] = await db(`SELECT count(*)::int as c FROM teams WHERE tenant_id = $1`, [TENANT_ID]);
  const [planCount] = await db(`SELECT count(*)::int as c FROM plans WHERE status = 'publicado'`);
  const [oppCount] = await db(`SELECT count(*)::int as c FROM opportunities WHERE tenant_id = $1`, [TENANT_ID]);
  const [saleCount] = await db(`SELECT count(*)::int as c FROM sales WHERE tenant_id = $1`, [TENANT_ID]);
  const [clientCount] = await db(`SELECT count(*)::int as c FROM clients WHERE tenant_id = $1`, [TENANT_ID]);
  const [subCount] = await db(`SELECT count(*)::int as c FROM subscriptions WHERE tenant_id = $1`, [TENANT_ID]);

  console.log(`  Usuários:     ${userCount.c}`);
  console.log(`  Times:        ${teamCount.c}`);
  console.log(`  Planos:       ${planCount.c}`);
  console.log(`  Oportunidades: ${oppCount.c}`);
  console.log(`  Vendas:       ${saleCount.c}`);
  console.log(`  Clientes:     ${clientCount.c}`);
  console.log(`  Assinaturas:  ${subCount.c}`);
  console.log('');

  console.log('  👤 Login (admin):     admin@dnacare.com.br / Admin@123');
  console.log('  👤 Login (gerente):   gerente@dnacare.com.br / Gerente@123');
  console.log('  👤 Login (vendedor1): vendedor1@dnacare.com.br / Vendedor@123');
  console.log('  👤 Login (vendedor2): vendedor2@dnacare.com.br / Vendedor@123');
  console.log(`  🏢 Tenant ID:         ${TENANT_ID}`);
  console.log('');
  } finally {
    if (ds.isInitialized) {
      await ds.destroy();
    }
  }
}

populate().catch((err) => {
  console.error('\n❌ ERRO:', err.message || err);
  console.error(err);
  process.exit(1);
});
