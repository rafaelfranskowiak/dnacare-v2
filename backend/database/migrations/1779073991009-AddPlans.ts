import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlans1779073991009 implements MigrationInterface {
    name = 'AddPlans1779073991009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "type" character varying(2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'rascunho', "available_for_sale" boolean NOT NULL DEFAULT false, "internal_notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_253d25dae4c94ee913bc5ec4850" UNIQUE ("name"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "plan_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" character varying NOT NULL, "version" integer NOT NULL, "name" character varying NOT NULL, "base_value" numeric(10,2) NOT NULL, "billing_cycle" character varying(20) NOT NULL DEFAULT 'MONTHLY', "dependent_rule" character varying(20) NOT NULL DEFAULT 'none', "included_dependents" integer NOT NULL DEFAULT '0', "max_dependents" integer, "min_dependents" integer NOT NULL DEFAULT '0', "dependent_value" numeric(10,2), "tiers_config" jsonb, "admission_fee" numeric(10,2), "status" character varying(20) NOT NULL DEFAULT 'rascunho', "published_at" TIMESTAMP WITH TIME ZONE, "inactivated_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dd2f605d45f2679a86a7c1c5b20" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "plan_versions"`);
        await queryRunner.query(`DROP TABLE "plans"`);
    }

}
