import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoalsTables1735689600000 implements MigrationInterface {
  name = 'CreateGoalsTables1735689600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "financial_goals" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "description" text,
        "category" varchar(100),
        "target_amount" numeric(12,2) NOT NULL,
        "initial_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "expected_monthly_contribution" numeric(12,2),
        "deviation_threshold" numeric(5,4) NOT NULL DEFAULT 0.15,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "start_date" timestamptz NOT NULL,
        "target_date" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_financial_goals_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "goal_progress" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "goal_id" uuid NOT NULL,
        "actual_amount" numeric(12,2) NOT NULL,
        "expected_amount" numeric(12,2),
        "note" text,
        "recorded_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_goal_progress_financial_goals" FOREIGN KEY ("goal_id") REFERENCES "financial_goals"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_goal_progress_goal_date" ON "goal_progress" ("goal_id", "recorded_at")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_financial_goals_user_status" ON "financial_goals" ("user_id", "status")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_goal_progress_goal_date"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_financial_goals_user_status"');
    await queryRunner.query('DROP TABLE IF EXISTS "goal_progress"');
    await queryRunner.query('DROP TABLE IF EXISTS "financial_goals"');
  }
}
