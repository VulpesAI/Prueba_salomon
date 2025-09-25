#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_if_missing() {
  local source_file="$1"
  local target_file="$2"

  if [[ ! -f "$source_file" ]]; then
    echo "[WARN] Archivo de ejemplo no encontrado: $source_file" >&2
    return 1
  fi

  if [[ -f "$target_file" ]]; then
    echo "[SKIP] Ya existe $target_file" >&2
    return 0
  fi

  cp "$source_file" "$target_file"
  echo "[OK] Copiado $source_file -> $target_file"
}

copy_if_missing "$ROOT_DIR/.env.example" "$ROOT_DIR/.env.local"
copy_if_missing "$ROOT_DIR/services/core-api/.env.example" "$ROOT_DIR/services/core-api/.env.local"
copy_if_missing "$ROOT_DIR/services/financial-connector/.env.example" "$ROOT_DIR/services/financial-connector/.env.local"
copy_if_missing "$ROOT_DIR/services/recommendation-engine/.env.example" "$ROOT_DIR/services/recommendation-engine/.env.local"

cat <<'MSG'

Se generaron archivos locales a partir de las plantillas. Completa los valores con
las credenciales entregadas por el gestor de secretos oficial y exporta las
variables necesarias antes de levantar los servicios.

- Para docker-compose puedes usar:
  export $(grep -v '^#' .env.local | xargs)
  docker compose --env-file .env.local up

- Para desarrollo individual revisa cada archivo `.env.local` y establece las
  variables como variables de entorno o usa herramientas como direnv.

MSG
