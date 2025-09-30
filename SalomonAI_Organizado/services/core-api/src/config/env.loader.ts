import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let isLoaded = false;

type LoadEnvFileFunction = (path: string) => void;

const loadFromFile = (filePath: string, loader: LoadEnvFileFunction | undefined) => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  if (!existsSync(filePath)) {
    return;
  }

  if (typeof loader === 'function') {
    loader(filePath);
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!key || key in process.env) {
      continue;
    }
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

export const loadRootEnv = () => {
  if (isLoaded) {
    return;
  }
  isLoaded = true;

  const candidatePaths = [
    resolve(process.cwd(), '..', '..', '.env'),
    resolve(process.cwd(), '.env'),
  ];

  const loader = (process as NodeJS.Process & { loadEnvFile?: LoadEnvFileFunction }).loadEnvFile;

  for (const path of candidatePaths) {
    loadFromFile(path, loader);
  }
};

