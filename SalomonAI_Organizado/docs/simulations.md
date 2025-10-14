# Simulation Engine

El Simulation Engine entrega cálculos de simulaciones financieras expuestos vía FastAPI en `/api/v1/simulations/*`. El servicio está apagado por defecto mediante `FEATURE_SIMULATIONS=false` y requiere tokens JWT emitidos por Supabase.

## Endpoints

### `POST /api/v1/simulations/mortgage`

- **Body**: `loan_amount`, `annual_interest_rate`, `years`, `payments_per_year`, costos mensuales opcionales (`monthly_insurance`, `monthly_maintenance`).
- **Respuesta**: `dividendo` mensual total (incluye seguros), `cae` anual en porcentaje y `tabla_resumida` con los primeros 12 dividendos (capital, interés, seguros y saldo).
- **Idempotencia**: inputs iguales generan la misma respuesta. No persiste datos.

### `POST /api/v1/simulations/budget-whatif`

- **Body**: ingreso mensual, ahorro inicial, categorías de gasto (fijo/variable), meta de ahorro (`savings_target_rate`) e inflación estimada.
- **Respuesta**: proyección de 12 meses (`proyeccion_12m`) con ahorro acumulado, gastos ajustados y excedente, más `alerts` con recomendaciones accionables.

## Autenticación y Seguridad

- Valida tokens Supabase vía JWKS (`SUPABASE_PROJECT_REF` o `SUPABASE_JWKS_URL`).
- Cada request debe incluir `Authorization: Bearer <token>`.
- Se aplica rate-limit in-memory configurable (`SIMULATION_RATE_LIMIT_REQUESTS`, `SIMULATION_RATE_LIMIT_WINDOW_SECONDS`).
- Middleware agrega `x-correlation-id` para trazabilidad; los errores siguen el esquema `{ "error": { code, message, correlationId, details } }`.

## Observabilidad

- `GET /health` entrega estado básico.
- `GET /metrics` expone metadatos del flag y configuración vigente (sin PII).
- Logs estructurados (JSON) listos para forwarders; no incluir PII en mensajes adicionales.

## Feature flag y despliegue

1. Mantén `FEATURE_SIMULATIONS=false` en ambientes productivos hasta definir go-live.
2. Al habilitar (`FEATURE_SIMULATIONS=true`), monitorea `%503` y métricas de rate-limit.
3. Contenedor disponible en `docker-compose.yml` (`simulation-engine`). Puerto por defecto `8010`.
4. Tests se ejecutan con `pytest` dentro del servicio (`requirements-dev.txt`).

## Roadmap

- Persistencia opcional para escenarios guardados por usuario (pendiente de diseño RLS).
- Métricas Prometheus detalladas y trazas OTel (en backlog).
- Nuevas simulaciones: pensión AFP, ahorro universitario, payoff de deudas.
