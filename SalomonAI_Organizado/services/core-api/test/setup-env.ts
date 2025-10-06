import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key-example-1234567890';
process.env.SUPABASE_JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated';
process.env.STATEMENTS_BUCKET = process.env.STATEMENTS_BUCKET ?? 'statements';
process.env.STATEMENTS_STATUS_TOPIC =
  process.env.STATEMENTS_STATUS_TOPIC ?? 'parsing-engine.statements';

if (!process.env.STATEMENTS_UPLOAD_DIR) {
  const defaultUploadDir = join(process.cwd(), 'tmp', 'uploads');
  rmSync(defaultUploadDir, { recursive: true, force: true });
  mkdirSync(defaultUploadDir, { recursive: true });
  process.env.STATEMENTS_UPLOAD_DIR = defaultUploadDir;
} else {
  mkdirSync(process.env.STATEMENTS_UPLOAD_DIR, { recursive: true });
}
