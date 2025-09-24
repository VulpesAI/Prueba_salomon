# Training Engine

Este servicio provee un pipeline liviano para entrenar el modelo de recomendaciones utilizado por `recommendation-engine`.

## Flujo de datos
1. **Parsing Engine** normaliza los CSV de transacciones y los almacena en `data/ingested/` junto con un dataset agregado.
2. **Training Engine** consume estos CSV (o cualquier dataset compatible) y genera un modelo basado en TF-IDF + regresión logística.
3. El modelo serializado (`artifacts/recommendation_model.joblib`) y el reporte de métricas (`artifacts/training_report.json`) pueden montarse en el contenedor del recommendation engine.

## Ejecutar entrenamiento local
```bash
# Crear entorno
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Entrenar usando el dataset de ejemplo
python train.py

# O entrenar usando los archivos ingeridos por parsing-engine
python train.py --input data/ingested
```

El comando generará los artefactos dentro de `artifacts/` y mostrará métricas de validación (accuracy, F1, precision, recall).

## Columnas esperadas
Los datasets deben contener las columnas mínimas:
- `description`: descripción libre de la transacción.
- `amount`: monto numérico (positivo para ingresos, negativo para egresos).
- `category`: etiqueta final que se desea aprender.

Se permiten alias comunes (`descripcion`, `monto`, `categoria`). El `parsing-engine` ya aplica esta normalización antes de guardar los datos.
