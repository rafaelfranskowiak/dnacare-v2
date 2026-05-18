import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFoundationalEntities1779073244798 implements MigrationInterface {
    name = 'AddFoundationalEntities1779073244798'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "webhook_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "asaas_event_id" character varying(50) NOT NULL, "event_type" character varying(50) NOT NULL, "payload" jsonb NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'received', "processed_at" TIMESTAMP WITH TIME ZONE, "error_message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_webhook_events_asaaas_event_id" UNIQUE ("asaas_event_id"), CONSTRAINT "PK_webhook_events" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "document_registry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "document_normalized" character varying(14) NOT NULL, "entity_type" character varying(30) NOT NULL, "entity_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_document_registry" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_document_registry_tenant_document" ON "document_registry" ("tenant_id", "document_normalized")`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "asaas_api_key" character varying`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "asaas_sandbox" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "asaas_webhook_url" character varying`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "asaas_webhook_id" character varying`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "asaas_webhook_auth_token" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "asaas_webhook_auth_token"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "asaas_webhook_id"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "asaas_webhook_url"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "asaas_sandbox"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "asaas_api_key"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_document_registry_tenant_document"`);
        await queryRunner.query(`DROP TABLE "document_registry"`);
        await queryRunner.query(`DROP TABLE "webhook_events"`);
    }
}
