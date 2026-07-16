import { AppDataSource } from '../../src/database/datasource';

interface DuplicateGroup {
  tenant_id: string;
  user_id: string;
  count: string;
}

interface TenantUserRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string | null;
  team_id: string | null;
  role: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const APPLY = process.argv.includes('--apply');
const CONFIRMATION = process.argv.find((arg) => arg.startsWith('--confirm='));
const REQUIRED_CONFIRMATION = '--confirm=DELETE_EXACT_DUPLICATES';

function businessSignature(row: TenantUserRow): string {
  return JSON.stringify({
    roleId: row.role_id ?? null,
    teamId: row.team_id ?? null,
    role: row.role ?? null,
    status: row.status,
  });
}

function selectCanonical(rows: TenantUserRow[]): TenantUserRow {
  return [...rows].sort((left, right) => {
    const byCreatedAt =
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    return byCreatedAt || left.id.localeCompare(right.id);
  })[0];
}

async function loadDuplicateGroups(): Promise<DuplicateGroup[]> {
  return AppDataSource.query(`
    SELECT tenant_id, user_id, COUNT(*)::text AS count
    FROM tenant_users
    GROUP BY tenant_id, user_id
    HAVING COUNT(*) > 1
    ORDER BY tenant_id, user_id
  `);
}

async function loadRows(
  tenantId: string,
  userId: string,
  lock = false,
): Promise<TenantUserRow[]> {
  return AppDataSource.query(
    `
      SELECT
        id,
        tenant_id,
        user_id,
        role_id,
        team_id,
        role,
        status,
        created_at,
        updated_at
      FROM tenant_users
      WHERE tenant_id = $1 AND user_id = $2
      ORDER BY created_at ASC, id ASC
      ${lock ? 'FOR UPDATE' : ''}
    `,
    [tenantId, userId],
  );
}

function assertExactBusinessDuplicates(
  rows: TenantUserRow[],
  tenantId: string,
  userId: string,
): void {
  const signatures = new Set(rows.map(businessSignature));
  if (signatures.size !== 1) {
    throw new Error(
      `Conflito detectado em tenant_users para tenant=${tenantId} user=${userId}. ` +
        'Os registros possuem papel, time ou status diferentes e não podem ser removidos automaticamente.',
    );
  }
}

async function main(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const groups = await loadDuplicateGroups();

    if (groups.length === 0) {
      console.log('Nenhum vínculo duplicado encontrado em tenant_users.');
      return;
    }

    console.log(
      `${groups.length} grupo(s) duplicado(s) encontrado(s) em tenant_users.`,
    );

    for (const group of groups) {
      const rows = await loadRows(group.tenant_id, group.user_id);
      assertExactBusinessDuplicates(rows, group.tenant_id, group.user_id);
      const canonical = selectCanonical(rows);

      console.log(
        `- tenant=${group.tenant_id} user=${group.user_id}: ` +
          `${rows.length} registros equivalentes; preservar ${canonical.id}`,
      );
    }

    if (!APPLY) {
      console.log(
        '\nModo de auditoria: nenhuma linha foi alterada. ' +
          `Para aplicar, execute novamente com --apply ${REQUIRED_CONFIRMATION}.`,
      );
      return;
    }

    if (CONFIRMATION !== REQUIRED_CONFIRMATION) {
      throw new Error(
        `Confirmação ausente. Use exatamente ${REQUIRED_CONFIRMATION}.`,
      );
    }

    await AppDataSource.transaction(async (manager) => {
      for (const group of groups) {
        const rows = (await manager.query(
          `
            SELECT
              id,
              tenant_id,
              user_id,
              role_id,
              team_id,
              role,
              status,
              created_at,
              updated_at
            FROM tenant_users
            WHERE tenant_id = $1 AND user_id = $2
            ORDER BY created_at ASC, id ASC
            FOR UPDATE
          `,
          [group.tenant_id, group.user_id],
        )) as TenantUserRow[];

        if (rows.length <= 1) {
          continue;
        }

        assertExactBusinessDuplicates(rows, group.tenant_id, group.user_id);
        const canonical = selectCanonical(rows);
        const duplicateIds = rows
          .filter((row) => row.id !== canonical.id)
          .map((row) => row.id);

        await manager.query(
          `DELETE FROM tenant_users WHERE id = ANY($1::uuid[])`,
          [duplicateIds],
        );
      }
    });

    const remaining = await loadDuplicateGroups();
    if (remaining.length > 0) {
      throw new Error(
        `A reparação terminou, mas ainda existem ${remaining.length} grupo(s) duplicado(s).`,
      );
    }

    console.log(
      'Reparação concluída. Somente registros semanticamente idênticos foram removidos.',
    );
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
