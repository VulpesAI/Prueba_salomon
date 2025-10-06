# Forecasting Engine

Microservicio responsable de generar proyecciones financieras para los usuarios a partir del historial de movimientos almacenado en la base de datos de SalomónAI.

## Características

- Modelos estadísticos ARIMA y Prophet con calibración automática de hiperparámetros
- Entrenamiento y evaluación automáticos por usuario y categoría con métricas de error (RMSE, MAE, MAPE)
- API REST (FastAPI) con endpoints para salud, entrenamiento (`/forecast/train`), evaluación (`/forecast/evaluate`) y generación de proyecciones
- Configuración a través de variables de entorno `FORECASTING_*`
- Preparado para modelos neuronales (LSTM/GRU) activados con `ENABLE_LSTM=true`

## Variables de entorno

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `FORECASTING_DATABASE_URL` | Cadena de conexión SQLAlchemy a PostgreSQL | `postgresql+psycopg://postgres:your-supabase-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require` |
| `FORECASTING_DEFAULT_MODEL` | Modelo preferido (`auto`, `arima`, `prophet`) | `auto` |
| `FORECASTING_DEFAULT_HORIZON_DAYS` | Horizonte de proyección en días | `30` |
| `FORECASTING_MINIMUM_HISTORY_DAYS` | Días mínimos de historia para usar modelos estadísticos | `30` |
| `FORECASTING_EVALUATION_WINDOW_DAYS` | Ventana utilizada para validar los modelos antes de generar métricas | `14` |
| `ENABLE_LSTM` | Activa el registro de modelos neuronales (requiere TensorFlow/PyTorch) | `false` |
| `SUPABASE_URL` / `FORECASTING_SUPABASE_URL` | URL del proyecto Supabase para almacenar resultados | — |
| `SUPABASE_KEY` / `FORECASTING_SUPABASE_KEY` | Clave service role de Supabase utilizada por el microservicio | — |
| `FORECASTING_FORECAST_TABLE_NAME` | Nombre de la tabla donde se guardan los pronósticos | `forecast_results` |

## Uso local

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8003
```

### Endpoints principales

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

Entrenar y evaluar modelos manualmente:

```http
POST /forecast/train
POST /forecast/evaluate
```

Ambos endpoints devuelven métricas globales y por categoría para trazabilidad.

Para almacenar resultados generados desde orquestadores externos, expone además:

```http
POST /forecast/save
Content-Type: application/json

{
  "user_id": "<uuid-del-usuario>",
  "forecast_type": "cashflow_projection",
  "forecast_data": { ...payload devuelto por GET /forecasts... },
  "calculated_at": "2025-02-10T12:00:00Z"
}
```

El servicio persiste los datos en Supabase usando `supabase-py`, almacenando el modelo utilizado y las métricas de error para garantizar trazabilidad y disponibilidad inmediata para el dashboard.

> **Nota:** Las dependencias para modelos neuronales (`tensorflow`, `torch`) son opcionales y solo deben instalarse cuando `ENABLE_LSTM=true`.
