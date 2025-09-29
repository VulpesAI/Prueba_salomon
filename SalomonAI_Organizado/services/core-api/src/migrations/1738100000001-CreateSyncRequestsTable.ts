import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSyncRequestsTable1738100000001 implements MigrationInterface {
  name = 'CreateSyncRequestsTable1738100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sync_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "client_request_id" uuid NOT NULL,
        "endpoint" varchar(255) NOT NULL,
        "payload" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'QUEUED',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "scheduled_at" timestamptz,
        "last_attempt_at" timestamptz,
        "processed_at" timestamptz,
        "error_message" varchar(255),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT sync_requests_client_request_id_unique UNIQUE ("client_request_id")
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_sync_requests_status_scheduled" ON "sync_requests" ("status", "scheduled_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_sync_requests_status_scheduled"');
    await queryRunner.query('DROP TABLE IF EXISTS "sync_requests"');
  }
}
