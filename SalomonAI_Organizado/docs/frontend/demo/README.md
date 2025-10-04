# Flujo de exportación en modo demo

Este flujo explica cómo funcionan las exportaciones personales cuando el frontend se ejecuta con `NEXT_PUBLIC_DEMO_MODE` activado.

## Contexto general

- La información demo proviene de `DemoFinancialDataContext`, que carga la cartola chilena de ejemplo (`CHILE_DEMO_STATEMENT`).
- El nuevo módulo [`lib/exporters.ts`](../../../frontend/lib/exporters.ts) serializa el estado demo en tres formatos: CSV, PDF y JSON.
- Para simular la experiencia real, cada exportación aplica una latencia aleatoria menor a 300 ms cuando el modo demo está activo.

## Rutas relevantes

- `/transactions`: muestra la tabla de movimientos. En modo demo los botones de exportación quedan marcados como "demo" y comunican si los datos están listos, en progreso o con error.
- `/transactions/export`: página dedicada a las descargas demo. Presenta el rango de fechas disponible, los datos ficticios del titular y las acciones de descarga en CSV, PDF y JSON.

## Experiencia del usuario

1. Activa la demo con `npm run dev:demo` o una variable `NEXT_PUBLIC_DEMO_MODE=true`.
2. Ingresa a `/transactions` y verifica la insignia de estado junto al CTA de exportar.
3. Abre `/transactions/export` para revisar el resumen de datos ficticios (nombre, correo, RUT y balances).
4. Selecciona cualquiera de los formatos. Se generará un archivo temporal con montos en CLP y se descargará automáticamente en el navegador.
5. Si no hay cartola cargada, la página mostrará una alerta indicando que debes subir transacciones o habilitar el modo demo.

## Pruebas automáticas

Las pruebas unitarias con Vitest (ver [`lib/__tests__/exporters.test.ts`](../../../frontend/lib/__tests__/exporters.test.ts)) validan que:

- El rango exportable coincide con la cartola demo.
- Los encabezados y montos en CLP están presentes en CSV y PDF.
- El JSON incluye montos formateados y la moneda `CLP`.
