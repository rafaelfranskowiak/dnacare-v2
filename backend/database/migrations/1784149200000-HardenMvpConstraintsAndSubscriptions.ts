import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenMvpConstraintsAndSubscriptions1784149200000
  implements MigrationInterface
{
  name = 'HardenMvpConstraintsAndSubscriptions1784149200000';

  private async assertNoDuplicates(
    queryRunner: QueryRunner,
    sql: string,
    label: string,
  ): Promise<void> {
    const rows = await queryRunner.query(sql);
    if (rows.length > 0) {
      throw new Error(
        `Migration blocked: duplicate records found for ${label}. Resolve duplicates before rerunning.`,
      );
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.assertNoDuplicates(
      queryRunner,
      `
        SELECT tenant_id, user_id
        FROM tenant_users
        GROUP BY tenant_id, user_id
        HAVING COUNT(*) > 1
        LIMIT 1
      `,
      'tenant_users(tenant_id, user_id)',
    );

    await this.assertNoDuplicates(
      queryRunner,
      `
        SELECT tenant_id, opportunity_id
        FROM sales
        GROUP BY tenant_id, opportunity_id
        HAVING COUNT(*) > 1
        LIMIT 1
      `,
      'sales(tenant_id, opportunity_id)',
    );

    await this.assertNoDuplicates(
      queryRunner,
      `
        SELECT tenant_id, opportunity_id
        FROM clients
        WHERE type = 'holder'
        GROUP BY tenant_id, opportunity_id
        HAVING COUNT(*) > 1
        LIMIT 1
      `,
      'clients holders(tenant_id, opportunity_id)',
    );

    await this.assertNoDuplicates(
      queryRunner,
      `
        SELECT tenant_id, sale_id
        FROM subscriptions
        GROUP BY tenant_id, sale_id
        HAVING COUNT(*) > 1
        LIMIT 1
      `,
      'subscriptions(tenant_id, sale_id)',
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tenant_users_tenant_user"
      ON "tenant_users" ("tenant_id", "user_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_sales_tenant_opportunity"
      ON "sales" ("tenant_id", "opportunity_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_clients_holder_tenant_opportunity"
      ON "clients" ("tenant_id", "opportunity_id")
      WHERE "type" = 'holder'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_subscriptions_tenant_sale"
      ON "subscriptions" ("tenant_id", "sale_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD "billing_cycle" character varying(20) NOT NULL DEFAULT 'MONTHLY'
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD "next_due_date" date
    `);

    await queryRunner.query(`
      UPDATE "subscriptions" AS subscription
      SET "billing_cycle" = UPPER(
        COALESCE(
          NULLIF(sale."plan_snapshot" ->> 'billingCycle', ''),
          'MONTHLY'
        )
      )
      FROM "sales" AS sale
      WHERE sale."id" = subscription."sale_id"
        AND sale."tenant_id" = subscription."tenant_id"
    `);

    await queryRunner.query(`
      UPDATE "subscriptions" AS subscription
      SET "recurring_value" = GREATEST(
        0,
        sale."base_value" + sale."dependents_value" - sale."discount"
      )
      FROM "sales" AS sale
      WHERE sale."id" = subscription."sale_id"
        AND sale."tenant_id" = subscription."tenant_id"
        AND subscription."recurring_value" IS DISTINCT FROM GREATEST(
          0,
          sale."base_value" + sale."dependents_value" - sale."discount"
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP COLUMN "next_due_date"
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP COLUMN "billing_cycle"
    `);
    await queryRunner.query(`
      DROP INDEX "UQ_subscriptions_tenant_sale"
    `);
    await queryRunner.query(`
      DROP INDEX "UQ_clients_holder_tenant_opportunity"
    `);
    await queryRunner.query(`
      DROP INDEX "UQ_sales_tenant_opportunity"
    `);
    await queryRunner.query(`
      DROP INDEX "UQ_tenant_users_tenant_user"
    `);
  }
}
