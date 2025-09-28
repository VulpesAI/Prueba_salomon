# Forecasting Engine

Microservicio responsable de generar proyecciones financieras para los usuarios a partir del historial de movimientos almacenado en la base de datos de SalomónAI.

## Características

- Modelos estadísticos ARIMA y, opcionalmente, Prophet (si está instalado en el entorno)
- Entrenamiento automático por usuario en base a la serie diaria de flujo neto
- API REST (FastAPI) con endpoints para salud y generación de proyecciones
- Configuración a través de variables de entorno `FORECASTING_*`

## Variables de entorno

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `FORECASTING_DATABASE_URL` | Cadena de conexión SQLAlchemy a PostgreSQL | `postgresql+psycopg://salomon_user:salomon_password@postgres:5432/salomon_db` |
| `FORECASTING_DEFAULT_MODEL` | Modelo preferido (`auto`, `arima`, `prophet`) | `auto` |
| `FORECASTING_DEFAULT_HORIZON_DAYS` | Horizonte de proyección en días | `30` |
| `FORECASTING_MINIMUM_HISTORY_DAYS` | Días mínimos de historia para usar Prophet | `30` |

## Uso local

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8003
```

### Endpoint principal

```http
GET /forecasts/{user_id}?horizon=30&model=auto
```

Respuesta:

```json
{
  "user_id": "123",
  "model_type": "arima",
  "horizon_days": 30,
  "generated_at": "2025-02-10T12:00:00Z",
  "history_days": 120,
  "forecasts": [
    { "date": "2025-02-11", "amount": 120000.0 },
    ...
  ],
  "metadata": {
    "history_start": "2024-10-14",
    "history_end": "2025-02-10",
    "history_sum": 2450000.0
  }
}
```

Si Prophet no está disponible, el motor utiliza automáticamente ARIMA o una proyección heurística como respaldo.
