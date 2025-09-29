# Operación de modelos y seguridad en SalomónAI

Este capítulo consolida la información operativa necesaria para ejecutar y
auditar el pipeline de entrenamiento (`services/training-engine/train.py`) y el
servicio de clasificación en producción (`services/core-api`). También integra
las pautas de seguridad y cumplimiento documentadas en `SECURITY.md` y los
mapeos ISO 27001 / SOC 2 existentes.

## 1. Pipeline de entrenamiento (`train.py`)

### Fuentes de datos y precondiciones
- **PostgreSQL**: el script lee etiquetas aceptadas desde la tabla definida en
  `CLASSIFICATION_LABELS_TABLE` (por defecto `classification_labels`).
  Únicamente usa registros cuyo `status` está en `PENDING`, `QUEUED`,
  `APPROVED` o `USED`, y marca como usados los que alimentaron el modelo
  resultante.【F:services/training-engine/train.py†L81-L117】
- **Mínimo de muestras**: valida que haya al menos `CLASSIFICATION_MIN_SAMPLES`
  (default `25`) y que existan al menos dos categorías diferentes antes de
  entrenar, garantizando balance básico.【F:services/training-engine/train.py†L219-L245】

### Dependencias y requisitos de ejecución
- **Librerías obligatorias**: `psycopg` para la conexión a Postgres,
  `scikit-learn` para el pipeline TF-IDF + Regresión Logística y `joblib` para
  persistir artefactos. El script aborta con errores explícitos si faltan.
  【F:services/training-engine/train.py†L33-L71】
- **Dependencias opcionales**: `boto3` para publicar artefactos en un bucket S3
  compatible (solo si se configura `MODEL_STORAGE_BUCKET`).【F:services/training-engine/train.py†L73-L105】
- **Variables de entorno clave**:
  - Conexión a base de datos mediante `DATABASE_URL` o el conjunto
    `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`,
    `POSTGRES_PASSWORD`.
  - `CLASSIFICATION_LABELS_TABLE`, `CLASSIFICATION_METRICS_TABLE`,
    `CLASSIFICATION_MIN_SAMPLES`.
  - `MODEL_REGISTRY_PATH`, `MODEL_STORAGE_BUCKET`, `MODEL_STORAGE_PREFIX` y
    credenciales AWS (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
    `AWS_REGION`) para almacenamiento remoto.【F:services/training-engine/train.py†L17-L65】

### Métricas generadas
- Usa una división train/test estratificada y calcula **accuracy**, **macro
  F1-score** y un **classification report** completo por clase; cada corrida
  persiste un snapshot JSON con `trained_at` para trazabilidad.【F:services/training-engine/train.py†L147-L188】
- Registra la métrica resumida en Postgres (tabla `CLASSIFICATION_METRICS_TABLE`)
  incluyendo `accuracy`, `macro_f1`, artefacto asociado y JSON con métricas
  completas.【F:services/training-engine/train.py†L119-L145】

### Publicación de artefactos
- Genera un archivo `classifier-<version>.joblib` y metadatos JSON con versión,
  métricas y número de muestras. Ambos se guardan en
  `MODEL_REGISTRY_PATH` y, si se habilita S3, se suben con metadata de versión al
  prefijo configurado, devolviendo la URI final del artefacto.【F:services/training-engine/train.py†L130-L210】
- La versión del modelo se deriva del timestamp UTC (`%Y%m%d%H%M%S`) para evitar
  colisiones y facilitar auditoría temporal.【F:services/training-engine/train.py†L201-L224】

## 2. Clasificación con embeddings y Qdrant (`core-api`)

### Flujo de inferencia
1. **Inicialización**: `ClassificationService` crea la colección de Qdrant con
   vectores de 384 dimensiones y distancia coseno, y precarga ejemplos básicos
   para categorías clave.【F:services/core-api/src/classification/classification.service.ts†L41-L120】
2. **Embeddings**: `NlpService` normaliza el texto en español financiero,
   expande sinónimos, genera un vector TF-IDF de dimensión fija (384) y lo
   normaliza. Los resultados se cachean para acelerar llamadas futuras.
   【F:services/core-api/src/nlp/nlp.service.ts†L12-L165】
3. **Búsqueda semántica**: el embedding se consulta en Qdrant mediante búsqueda
   vectorial con `score_threshold` configurable, obteniendo payloads y puntajes
   de similitud.【F:services/core-api/src/qdrant/qdrant.service.ts†L56-L104】
4. **Agregación**: se agregan scores por categoría, se aplican boosts por
   frecuencia y heurísticas basadas en monto, entregando categoría principal y
   alternativas. Si no hay vecinos o la confianza es baja, recurre a reglas
   heurísticas (fallback).【F:services/core-api/src/classification/classification.service.ts†L122-L256】

### Requisitos y gobierno de datos
- **Consistencia de dimensiones**: todos los embeddings deben ser de 384 floats
  para coincidir con la colección. Cambios requieren recrear la colección.
- **Campos necesarios en payload**: cada punto almacenado incluye `text`,
  `category`, `amount`, `confidence`, `timestamp` y `version`, lo que permite
  trazabilidad y segmentaciones posteriores.【F:services/core-api/src/classification/classification.service.ts†L258-L300】
- **Calidad de etiquetas**: las correcciones de usuarios se persisten como
  `ClassificationLabel` y se reinyectan en Qdrant tras validación, manteniendo
  historial de estatus y metadata para auditorías.【F:services/core-api/src/classification/classification.service.ts†L302-L386】
- **Salud operativa**: hay tareas cron para mantenimiento del cache de embeddings
  y para orquestar reentrenamientos cuando existen suficientes etiquetas nuevas.
  【F:services/core-api/src/classification/classification.service.ts†L402-L520】

## 3. Capítulo operativo de seguridad

Las siguientes prácticas consolidan `SECURITY.md`, ISO/IEC 27001 y SOC 2 en un
procedimiento operativo continuo.

### Rotación y resguardo de secretos
- **KMS y TLS 1.3**: Mantener la rotación automática de certificados y secretos
  usando el servicio KMS descrito, alineado con ISO A.8.29 y SOC 2 CC6.6.
  Registre evidencia de cada rotación (ticket de cambio y hash del certificado).
  【F:SECURITY.md†L27-L33】【F:docs/compliance/ISO27001.md†L12-L31】
- **Refresh tokens de un solo uso**: Asegurar que los despliegues mantengan la
  política de rotación en `auth_tokens`, revocando tokens previos (ISO A.5.15,
  SOC 2 CC6).【F:SECURITY.md†L17-L26】【F:docs/compliance/SOC2.md†L9-L32】

### Monitoreo centralizado (SIEM)
- **Cobertura mínima**: Registrar inicios de sesión, enrolamientos/desenrolamientos
  de MFA, rotación de tokens y errores de autenticación. Estos eventos alimentan
  al colector definido en `SiemLoggerService`, contribuyendo a ISO A.8.24 y SOC 2
  CC7.【F:SECURITY.md†L21-L26】【F:docs/compliance/ISO27001.md†L12-L31】【F:docs/compliance/SOC2.md†L25-L41】
- **Operación**: Validar diariamente la ingestión en el SIEM y configurar alertas
  de umbrales anómalos (p. ej., intentos fallidos por usuario).

### Autenticación reforzada (MFA)
- **Cumplimiento**: El enrolamiento y uso obligatorio de TOTP satisface los
  controles ISO A.5.15 y SOC 2 CC6. Configure políticas para caducar códigos de
  respaldo y exigir MFA en flujos OAuth de alta sensibilidad.【F:SECURITY.md†L11-L20】【F:docs/compliance/ISO27001.md†L12-L22】【F:docs/compliance/SOC2.md†L9-L24】
- **Operación**: Revisar semanalmente registros de MFA para detectar usuarios sin
  MFA activo y forzar enrolamiento.

## 4. Checklists de auditoría y métricas

### Auditoría de modelos (mensual)
1. Verificar que la última versión de `classifier-*.joblib` tenga metadatos
   completos (versión, métricas, `sample_count`).【F:services/training-engine/train.py†L201-L224】
2. Revisar la tabla de métricas para confirmar registros consecutivos sin gaps y
   precisión macro F1 >= objetivo interno.
3. Validar que todas las etiquetas usadas estén marcadas como `USED` con
   `lastModelVersion` actualizado.【F:services/training-engine/train.py†L99-L118】
4. Ejecutar `train.py` en entorno controlado para garantizar reproducibilidad
   usando el mismo snapshot de datos.

**Métricas a registrar**
- Accuracy y macro F1 de cada corrida.
- Conteo de ejemplos por categoría (derivado del classification report).
- Latencia media de inferencia y ratio de fallback versus Qdrant (desde métricas
  del servicio de clasificación).【F:services/core-api/src/classification/classification.service.ts†L180-L235】

### Auditoría de seguridad (quincenal)
1. Revisar logs SIEM para asegurarse de que las alertas críticas se despachan y
   de que existe evidencia de revisión manual.【F:SECURITY.md†L21-L26】
2. Confirmar que los secretos rotados tienen fecha y ticket de autorización.
3. Asegurar que MFA está habilitado para usuarios activos y que existen códigos
   de respaldo válidos.【F:SECURITY.md†L11-L20】
4. Ejecutar controles de `detect-secrets`/`trufflehog` en el repositorio y
   registrar resultados.【F:SECURITY.md†L5-L15】

**Métricas a registrar**
- Número de incidentes SIEM investigados vs. detectados.
- Porcentaje de usuarios con MFA habilitado.
- Tiempo promedio de rotación de secretos y certificados.
- Conteo de hallazgos de escaneo de secretos y tiempo de resolución.

---

**Referencias cruzadas**: Los mapeos detallados se mantienen en
`docs/compliance/ISO27001.md` y `docs/compliance/SOC2.md`; este capítulo actúa
como runbook operativo para equipos de datos y seguridad.
