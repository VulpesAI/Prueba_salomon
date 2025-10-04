# Salomon AI Deployment Notes

## Configurar variables de entorno en Firebase App Hosting

Sigue estos pasos desde la [consola de Firebase](https://console.firebase.google.com/) para cargar los secretos requeridos por el servicio Core API:

1. Abre tu proyecto de Firebase y navega a **Hosting → App Hosting**.
2. Selecciona la aplicación correspondiente al Core API y haz clic en **Editar variables de entorno** (o **Manage environment variables**).
3. Añade las siguientes claves con sus valores reales como _Runtime secrets_:
   - `JWT_SECRET`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
4. Guarda los cambios y vuelve a desplegar la aplicación para que las nuevas variables queden disponibles en el runtime.

> Los archivos de configuración versionados incluyen solo marcadores de posición (`<SET-IN-FIREBASE-SECRETS>`) para estos campos. Nunca subas los valores reales al repositorio; mantenlos exclusivamente en Firebase o en tu gestor de secretos.

## Perfil de ejecución

Cuando el Core API no depende de servicios externos (bases de datos, colas, etc.), mantén `CORE_API_PROFILE=minimal`. Este perfil utiliza únicamente las dependencias internas necesarias para exponer la API y simplifica la configuración del entorno. Cambia a otro perfil solo cuando realmente necesites habilitar integraciones adicionales.

## Demo local sin dependencias externas

El proyecto incluye un modo demo que evita llamadas al backend y precarga datos financieros ficticios recientes de Chile. Para activarlo:

1. **Frontend**
   - Copia `frontend/.env.example` a `.env.local` (o ajusta tus variables existentes) y establece:
     ```bash
     NEXT_PUBLIC_DEMO_MODE=true
     NEXT_PUBLIC_DEFAULT_CURRENCY=CLP
     NEXT_PUBLIC_DEFAULT_LOCALE=es-CL
     ```
   - Usa los nuevos scripts que ya inyectan la bandera cuando ejecutes el cliente:
     ```bash
     npm run dev:demo       # next dev con datos demo
     npm run build:demo     # next build con el modo demo activo
     npm run lint:fix       # next lint --fix respetando el modo demo
     ```

2. **Backend (Core API)**
   - Copia `services/core-api/.env.example` a `.env.local` y define:
     ```bash
     DEMO_MODE=true
     DEFAULT_CURRENCY=CLP
     DEFAULT_LOCALE=es-CL
     ```
   - Estas variables deshabilitan los refetch al iniciar la demo y mantienen los mismos formatos regionales que el frontend.

Con estas variables activadas puedes navegar por el dashboard y el asistente sin levantar servicios adicionales: las consultas se resuelven desde el `DemoFinancialDataProvider` y los hooks evitan solicitudes HTTP reales.

## Demo para inversionistas (post-login)

La experiencia demo que se muestra a inversionistas utiliza exclusivamente variables públicas del frontend. Configura `frontend/.env.local` con los siguientes valores visibles por el cliente web:

- `NEXT_PUBLIC_DEMO_MODE=true`
- `NEXT_PUBLIC_DEFAULT_CURRENCY=CLP`
- `NEXT_PUBLIC_DEFAULT_LOCALE=es-CL`

La bandera `NEXT_PUBLIC_DEMO_MODE` habilita el recorrido guiado dentro de la sesión personal ficticia en pesos chilenos (CLP). Tras iniciar sesión con las credenciales compartidas para demos:

1. Aterriza en el **dashboard** para revisar el resumen de flujo de caja y objetivos de corto plazo.
2. Entra a **Transacciones** y aplica el filtro de categoría "Restaurantes" para resaltar el control de gastos cotidianos.
3. Abre **Metas** y muestra el progreso de ahorro a mediano plazo con cifras autogeneradas en CLP.
4. Visita **Alertas** para evidenciar las notificaciones proactivas sobre desvíos presupuestarios.
5. Continúa al **Asistente** donde se ilustran recomendaciones personalizadas basadas en el historial simulado.
6. Cierra la presentación con la **exportación CSV**, enfatizando cómo se puede compartir el historial financiero completo sin salir del flujo demo.

Todo el trayecto funciona sobre datos embebidos en el bundle del cliente, por lo que no se requiere configuración adicional de servicios backend para la demostración.
