import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformAdminAndTenantUsers1778781393242 implements MigrationInterface {
    name = 'AddPlatformAdminAndTenantUsers1778781393242'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_users_tenant_id"`);
        await queryRunner.query(`CREATE TABLE "tenant_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "user_id" character varying NOT NULL, "role_id" character varying, "status" character varying NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8ce1bc9e3a5887c234900365447" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "is_platform_admin" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_platform_admin"`);
        await queryRunner.query(`DROP TABLE "tenant_users"`);
        await queryRunner.query(`CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenant_id") `);
    }

}
