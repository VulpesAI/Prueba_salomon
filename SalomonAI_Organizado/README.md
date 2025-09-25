# Demo full-stack SalomónAI

Esta demo orquesta el backend de NestJS existente, un frontend en Next.js y servicios de infraestructura para mostrar un flujo completo de onboarding, conexión bancaria simulada y dashboard financiero.

## 1. Requisitos previos

* Docker y Docker Compose.
* Puertos locales libres: `3000` (API), `3001` (frontend), `5432` (PostgreSQL), `6333` (Qdrant), `8001`, `9092`.

## 2. Configuración inicial

1. Clona el repositorio y entra al directorio `SalomonAI_Organizado`.
2. Copia el archivo de variables de entorno:

   ```bash
   cp .env.example .env
   ```

   Puedes ajustar credenciales si lo necesitas. El modo demo usa integraciones mockeadas de Belvo por defecto (`BELVO_USE_MOCKS=true`).

3. (Opcional) Si deseas sobreescribir la URL del backend para el frontend, copia también el archivo de ejemplo:

   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

## 3. Levantar la demo con Docker Compose

```bash
docker compose up --build
```

Esto iniciará:

* `postgres`: base de datos para el backend.
* `qdrant`: vector DB utilizada para clasificación.
* `kafka` y `zookeeper`: infraestructura auxiliar.
* `core-api`: NestJS API.
* `frontend`: aplicación Next.js con modo de desarrollo.

La API quedará disponible en `http://localhost:3000/api` y el frontend en `http://localhost:3001`.

## 4. Poblar datos de demostración

Con los contenedores corriendo, ejecuta el seeder para crear un usuario demo, una conexión bancaria simulada y movimientos financieros recientes:

```bash
docker compose run --rm core-api npm run seed:demo
```

Credenciales generadas:

* **Correo:** `demo@salomon.ai`
* **Contraseña:** `Demo1234!`

Puedes cambiarlas modificando `DEMO_USER_EMAIL` y `DEMO_USER_PASSWORD` en `.env` antes de ejecutar el seed.

## 5. Recorrido sugerido

1. Abre `http://localhost:3001` y regístrate con un correo propio para probar el flujo de onboarding (se utiliza el endpoint `/auth/register`).
2. Inicia sesión para obtener el JWT emitido por la API (`/auth/login`).
3. Conecta una institución bancaria desde la pantalla “Conecta tu banco”. Los datos provienen del modo mock del servicio Belvo (`/belvo/*`).
4. Visita el dashboard para visualizar ingresos, gastos, tendencias y los últimos movimientos (`/dashboard/*`).

## 6. Scripts útiles

* `npm run seed:demo` (en `services/core-api`): genera datos mockeados para la demo.
* `npm run dev` (en `frontend`): inicia el frontend fuera de Docker si prefieres un desarrollo local.
* `npm run build` / `npm run start`: comandos estándar de Next.js.

## 7. Notas técnicas

* El servicio `BelvoService` detecta automáticamente si existen credenciales reales. Si no están configuradas o si `BELVO_USE_MOCKS=true`, expone instituciones, cuentas y transacciones mockeadas.
* El frontend en Next.js utiliza `fetch` directo hacia `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:3000`).
* El seeder usa TypeORM para crear entidades directamente y puede ejecutarse cuantas veces se necesite: sobrescribe movimientos y la conexión demo.

---

¡Listo! Con estos pasos cualquier colaborador podrá levantar la demo de punta a punta en menos de 5 minutos.
