import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTokens202412161200 implements MigrationInterface {
  name = 'CreateAuthTokens202412161200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "refresh_token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "rotated_at" timestamptz,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_auth_tokens_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_auth_tokens_user_id" ON "auth_tokens" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_auth_tokens_user_refresh" ON "auth_tokens" ("user_id", "refresh_token_hash")',
    );

    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "uid" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "metadata" json',
    );
    await queryRunner.query(
      "ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"roles\" text NOT NULL DEFAULT 'user'",
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" json',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "oauth_providers" json',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_temp_secret" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_backup_codes" json',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_mfa_at" timestamptz',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile" json',
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_users_uid'
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "UQ_users_uid" UNIQUE ("uid");
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_uid"');

    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "profile"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "last_mfa_at"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_backup_codes"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_temp_secret"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_secret"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_enabled"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "oauth_providers"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "preferences"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "roles"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "metadata"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "uid"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_auth_tokens_user_refresh"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_auth_tokens_user_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "auth_tokens"');
  }
}
