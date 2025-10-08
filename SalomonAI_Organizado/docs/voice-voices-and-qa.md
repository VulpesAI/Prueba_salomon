# Selector de voces OpenAI y QA de voz

Este documento describe cómo funciona el selector de voces de SalomónAI, cómo se mantienen los catálogos de voces de OpenAI y el flujo de QA automatizado para validar STT/TTS en español.

## 1. Catálogo central de voces

* **Archivo fuente:** [`config/openai_voice_registry.json`](../config/openai_voice_registry.json) con tipado en [`config/openai_voice_registry.ts`](../config/openai_voice_registry.ts).
* **Back-end (voice-gateway):** [`app/voice_registry.py`](../services/voice-gateway/app/voice_registry.py) carga el catálogo, ejecuta smoke tests contra `gpt-4o-mini-tts` y `gpt-4o-realtime-preview` y expone el resultado en `GET /voice/voices`.
* **Validaciones dinámicas:** las voces que fallan en TTS o Realtime se desactivan dinámicamente hasta el próximo refresco de disponibilidad (se ejecuta en el evento `startup`). El endpoint devuelve latencias estimadas y el detalle de fallas, útil para monitoreo.

```json
{
  "voices": [
    {
      "id": "alloy",
      "label": "Alloy",
      "supports": { "tts": true, "realtime": true },
      "latency_ms": { "tts": 820.3, "realtime": 95.4 }
    }
  ],
  "model_tts": "gpt-4o-mini-tts",
  "model_realtime": "gpt-4o-realtime-preview"
}
```

## 2. Selección de voz por usuario

1. El frontend consume `GET /voice/voices` y muestra un selector con previsualización (`VoicePicker`).
2. El usuario selecciona una voz y la persistencia se realiza en Supabase (`POST /user/settings/voice`). La tabla se crea con la migración [`supabase/migrations/20240722120000_user_settings_voice.sql`](../supabase/migrations/20240722120000_user_settings_voice.sql).
3. En cada request:
   * **TTS (`POST /voice/speech`):** si el cuerpo no incluye `voice`, se aplica la preferencia guardada; si hay encabezado `X-User-Id`, se recupera la preferencia.
   * **Realtime (`/voice/stream`):** en la apertura del socket se consulta la preferencia (query `user=` o header). Los mensajes `config` validan la voz y responden error si no está soportada.

### Componentes relevantes

* **Frontend:**
  * [`components/VoicePicker.tsx`](../frontend/components/VoicePicker.tsx)
  * [`hooks/useVoiceGateway.ts`](../frontend/hooks/useVoiceGateway.ts)
  * [`utils/voiceLoop.ts`](../frontend/utils/voiceLoop.ts)
  * Página demo: [`app/demo/page.tsx`](../frontend/app/demo/page.tsx)
* **Backend:**
  * Rutas principales en [`services/voice-gateway/app/main.py`](../services/voice-gateway/app/main.py)
  * Repositorio de preferencias (`Supabase` o memoria) en [`services/voice-gateway/app/user_settings.py`](../services/voice-gateway/app/user_settings.py)
  * Configuración y variables en [`services/voice-gateway/app/settings.py`](../services/voice-gateway/app/settings.py)

## 3. QA de voz multiacento

El paquete `services/voice-gateway/qa` contiene un runner que valida STT/TTS por voz y acento.

* **Dataset:** [`qa/datasets/financial_spanish.jsonl`](../services/voice-gateway/qa/datasets/financial_spanish.jsonl) con frases financieras (es-CL, es-AR, es-MX, es-CO, es-ES). Cada caso incluye entidades esperadas y valores numéricos.
* **Métricas:**
  * WER/CER (`jiwer`)
  * F1 de entidades financieras
  * Exactitud numérica (TTS→STT inverso)
  * MOS subjetivo cargado desde [`qa/mos_reference.json`](../services/voice-gateway/qa/mos_reference.json)
  * Latencias promedio y p95 por voz
* **Runner:** [`qa/run_voice_quality.py`](../services/voice-gateway/qa/run_voice_quality.py)

```bash
# Ejecuta la evaluación completa (requiere OPENAI_API_KEY)
cd services/voice-gateway
python -m qa.run_voice_quality --output qa_report.json
```

*El comando devuelve `0` si todas las voces cumplen, `2` si alguna excede `WER > 0.18` o `numeric_accuracy < 0.98`. Se puede ajustar los umbrales con `--max-wer` y `--min-numeric`.*

Los reportes incluyen un arreglo `per_case` con métricas por frase/acento, pensado para integrarse en CI como gate de calidad de voz.

## 4. Variables de entorno

| Variable | Descripción |
| --- | --- |
| `OPENAI_API_KEY` | Clave utilizada por STT/TTS y smoke tests |
| `OPENAI_TTS_MODEL` | Modelo TTS (por defecto `gpt-4o-mini-tts`) |
| `OPENAI_REALTIME_MODEL` | Modelo Realtime usado en streaming |
| `OPENAI_TTS_DEFAULT_VOICE` | Voz por defecto cuando no hay preferencia |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Requeridos para persistir `user_settings.voice_id` |
| `VOICE_LANG_DEFAULT` | Idioma base (`es-CL`) para síntesis |

> **Nota:** Si no se configura Supabase, el gateway usa un repositorio en memoria y las preferencias no persisten entre ejecuciones.

## 5. Observabilidad

* Las métricas Prometheus incluyen contadores de TTS/STT y gauges para Realtime.
* `voice_registry.availability_snapshot()` incorpora latencias del smoke test, útiles para dashboards comparativos.

## 6. Próximos pasos sugeridos

* Agregar refrescos periódicos del registro de voces vía `asyncio.create_task`.
* Integrar el reporte `qa_report.json` como artefacto en CI/CD y publicar alertas cuando un gate falle.
* Extender el dataset con ruido de fondo y variantes métricas específicas (ej. pronunciación de “UF/UTM”).
