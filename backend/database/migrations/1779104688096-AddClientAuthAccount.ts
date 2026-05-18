import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientAuthAccount1779104688096 implements MigrationInterface {
    name = 'AddClientAuthAccount1779104688096'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "client_auth_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "client_id" character varying NOT NULL, "email" character varying(255), "phone" character varying(20), "document_normalized" character varying(14) NOT NULL, "password_hash" character varying(255), "auth_provider" character varying(20), "is_active" boolean NOT NULL DEFAULT false, "last_login_at" TIMESTAMP WITH TIME ZONE, "email_verified_at" TIMESTAMP WITH TIME ZONE, "phone_verified_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9454b2685dd23f042fdf02dfb31" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "client_auth_accounts"`);
    }

}
