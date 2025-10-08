# Integraciones frontend con APIs reales

Este documento resume cómo el frontend se conecta a los servicios reales del backend de Salomón AI.

## Configuración de entorno

Añade las siguientes variables a `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://api.salomonai.com
NEXT_PUBLIC_SSE_TIMEOUT_MS=60000
NEXT_PUBLIC_PAGE_SIZE=50
```

El token JWT emitido por Firebase o el backend debe almacenarse en `sessionStorage` bajo la clave `jwt`. El identificador de usuario activo se lee desde `sessionStorage.current_user_id` cuando se requieren recomendaciones personalizadas.

## Cliente HTTP

El archivo [`lib/api.ts`](../lib/api.ts) centraliza los accesos a `fetch` e inyecta el encabezado `Authorization` con el JWT disponible. Las respuestas se validan con Zod en los hooks de React Query definidos en [`lib/hooks.ts`](../lib/hooks.ts).

## Dashboard

- **Resumen:** `GET /dashboard/resumen` → [`useResumen`](../lib/hooks.ts) (y [`useDashboardResumen`](../lib/hooks.ts) como alias) validado con [`ResumenResp`](../lib/schemas.ts). El resumen también se muestra en el header mediante [`HeaderResumen`](../components/HeaderResumen.tsx).
- **Proyección:** `GET /forecasts/{user_id}?horizon=30` → [`useForecast`](../lib/hooks.ts). [`app/(authenticated)/analytics/forecasts/page.tsx`](../app/(authenticated)/analytics/forecasts/page.tsx) renderiza el gráfico en tiempo real con Recharts.
- **UI principal:** [`app/(authenticated)/dashboard/overview/page.tsx`](../app/(authenticated)/dashboard/overview/page.tsx) muestra métricas reales, skeletons durante carga y estado de error con reintento.

## Transacciones

- **Listado:** `GET /movimientos` con parámetros `from`, `to`, `category`, `q`, `page` y `limit` → [`useMovimientos`](../lib/hooks.ts).
- **Interfaz:** [`app/(authenticated)/transactions/page.tsx`](../app/(authenticated)/transactions/page.tsx) soporta búsqueda sanitizada, `infinite scroll` con React Query y botón manual de recarga.

## Chat conversacional

- **Streaming SSE:** [`streamSSE`](../lib/chatStream.ts) consume `POST /conversation/stream-sse` y entrega tokens, intents e insights en tiempo real.
- **Fallback sin streaming:** [`useChatSync`](../lib/hooks.ts) usa `POST /conversation/chat`.
- **WebSocket (opcional):** [`streamChatWS`](../lib/chatStream.ts) se conecta a `WS /conversation/stream` para recibir deltas en tiempo real.
- **Pantalla:** [`app/(authenticated)/assistant/page.tsx`](../app/(authenticated)/assistant/page.tsx) gestiona la conversación, cancelación, reconexión básica e insights detectados.

## Recomendaciones personalizadas

- **Endpoint:** `GET /recommendations/personalized/{user_id}?limit=...` → [`useRecomendaciones`](../lib/hooks.ts) con feedback mediante [`useRecoFeedback`](../lib/hooks.ts).
- **Vista:** [`app/(authenticated)/analytics/recommendations/page.tsx`](../app/(authenticated)/analytics/recommendations/page.tsx) lista recomendaciones priorizadas, muestra puntajes del motor y permite enviar feedback "Útil/No útil".

## Voz (STT / TTS / Tiempo real)

- **Transcripción:** `POST /voice/transcriptions` → [`useSTT`](../lib/hooks.ts).
- **Síntesis:** `POST /voice/speech` → [`useTTS`](../lib/hooks.ts).
- **WebSocket:** `WS /voice/stream` disponible a través de `streamChatWS` para sesiones de voz en vivo.
- **Utilidades:** [`lib/voiceClient.ts`](../lib/voiceClient.ts) transforma blobs ↔ Base64.
- **Componente demo:** [`components/VoiceRoundTrip.tsx`](../components/VoiceRoundTrip.tsx) realiza el ciclo grabar → transcribir → sintetizar con los endpoints reales.

## Buenas prácticas

- Los hooks de React Query comparten claves únicas para permitir `refetch` selectivo.
- Cada error de red se muestra en la interfaz con opción de reintento y sin exponer datos sensibles.
- Los filtros de búsqueda se sanitizan para evitar inyecciones en la capa de backend.
- Todas las respuestas se validan con Zod antes de propagar datos a los componentes.
