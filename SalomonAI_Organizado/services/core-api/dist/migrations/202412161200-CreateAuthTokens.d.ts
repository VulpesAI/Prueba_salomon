import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateAuthTokens202412161200 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
