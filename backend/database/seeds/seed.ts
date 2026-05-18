import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../../src/database/datasource';

async function seed() {
  const ds = await AppDataSource.initialize();

  const password = await bcrypt.hash('Foco@ia8992!', 10);

  // Create default tenant
  await ds.query(
    `INSERT INTO tenants (id, slug, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO NOTHING`,
    ['00000000-0000-0000-0000-000000000001', 'default', 'Default Tenant'],
  );

  // Create admin user
  await ds.query(
    `INSERT INTO users (id, email, password, name, tenant_id, active, is_platform_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, tenant_id = EXCLUDED.tenant_id, is_platform_admin = EXCLUDED.is_platform_admin`,
    [
      '00000000-0000-0000-0000-000000000002',
      'suporte@wizer.digital',
      password,
      'Admin',
      '00000000-0000-0000-0000-000000000001',
      true,
      true,
    ],
  );

  console.log('Seed complete');
  await ds.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
