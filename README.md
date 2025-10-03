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
