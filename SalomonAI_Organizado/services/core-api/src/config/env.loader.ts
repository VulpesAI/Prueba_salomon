import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ENV_FILES = ['.env.local', '.env'];

const parseEnvFile = (filePath: string): Record<string, string> => {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env: Record<string, string> = {};

  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    env[key] = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }

  return env;
};

export function loadRootEnv(): void {
  const projectRoot = path.resolve(__dirname, '..', '..');

  for (const fileName of ENV_FILES) {
    const filePath = path.join(projectRoot, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof process.env[key] === 'undefined') {
        process.env[key] = value;
      }
    }
  }
}
