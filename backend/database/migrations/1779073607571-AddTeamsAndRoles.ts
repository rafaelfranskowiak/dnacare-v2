import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamsAndRoles1779073607571 implements MigrationInterface {
    name = 'AddTeamsAndRoles1779073607571'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_document_registry_tenant_document"`);
        await queryRunner.query(`CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "name" character varying(100) NOT NULL, "manager_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD "team_id" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD "role" character varying(20)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ff1bdbd1855f1d84895cd17e8a" ON "document_registry" ("tenant_id", "document_normalized") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ff1bdbd1855f1d84895cd17e8a"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP COLUMN "role"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP COLUMN "team_id"`);
        await queryRunner.query(`DROP TABLE "teams"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_document_registry_tenant_document" ON "document_registry" ("tenant_id", "document_normalized") `);
    }

}
