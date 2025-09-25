# Recommendation Engine

Servicio FastAPI que expone el endpoint `/recommendations` con dos modos de operación:

1. **Modelo entrenado** (`artifacts/recommendation_model.joblib`):
   - Clasifica la transacción con un pipeline TF-IDF + regresión logística.
   - Devuelve la recomendación basada en la categoría predicha.
   - Incluye metadatos (`training_report.json`) para health checks y trazabilidad.
2. **Heurísticas de respaldo**: cuando no existe modelo cargado, se aplican reglas básicas por monto y categoría.

## Variables relevantes
- `RECOMMENDATION_MODEL_PATH`: ruta del `.joblib` entrenado (opcional).
- `RECOMMENDATION_MODEL_REPORT`: ruta del reporte JSON (opcional).
- `RECOMMENDATION_ENGINE_ALLOWED_ORIGINS`: lista de dominios permitidos para CORS.

## Flujo sugerido
1. Ejecutar `parsing-engine` para normalizar CSV de transacciones reales.
2. Entrenar el modelo con `services/training-engine/train.py`.
3. Copiar los artefactos generados a `services/recommendation-engine/artifacts/` o montar el volumen en Docker.
4. Levantar este servicio (Docker o `uvicorn main:app --reload`).

El endpoint `/health` informa si el modelo está disponible y la fecha de entrenamiento utilizada.
