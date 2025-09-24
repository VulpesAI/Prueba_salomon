# Guía de Configuración de Firebase para SalomonAI

## 🔥 Configuración Paso a Paso

### 1. Crear Proyecto Firebase

1. **Ve a Firebase Console**: https://console.firebase.google.com/
2. **Crear nuevo proyecto**:
   - Nombre: `SalomonAI` (o el nombre que prefieras)
   - Google Analytics: Opcional (recomendado activar)
   - Región: Elige la más cercana a tus usuarios (ej: South America)

### 2. Configurar Authentication

1. **En Firebase Console**, ve a `Authentication`
2. **Habilitar Sign-in methods**:
   - Email/Password: ✅ Habilitar
   - Google: ✅ Habilitar (opcional pero recomendado)
   - Otros providers: Según necesidad

### 3. Configurar Firestore Database (Opcional)

1. **Ve a Firestore Database**
2. **Crear base de datos**:
   - Modo: Start in production mode
   - Región: Same as your project region

### 4. Obtener Configuración para Frontend

1. **Ve a Project Settings** (⚙️ icono)
2. **Scroll down** hasta "Your apps"
3. **Add app** → **Web** (</> icono)
4. **Registrar app**:
   - App nickname: `SalomonAI Frontend`
   - Firebase Hosting: No (usaremos Vercel/Netlify más tarde)
5. **Copiar la configuración** que aparece:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

### 5. Obtener Service Account para Backend

1. **En Project Settings**, ve a **Service accounts**
2. **Generate new private key** → Download JSON
3. **⚠️ IMPORTANTE**: Este archivo contiene credenciales sensibles

### 6. Configurar Variables de Entorno

#### Frontend (.env.local):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...
```

#### Backend (`.env.local` o gestor de secretos):
```bash
# Extraer del JSON descargado:
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789...
FIREBASE_PRIVATE_KEY_ID=abcdef123...
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40tu-proyecto.iam.gserviceaccount.com
```

### 7. Configurar Firebase Security Rules (Opcional)

En **Firestore Database** → **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios solo pueden acceder a sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Datos públicos (si los necesitas)
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 8. Verificar Configuración

#### Test Backend:
```bash
cd services/core-api
npm run start:dev
# Verificar que no hay errores de Firebase
```

#### Test Frontend:
```bash
# El frontend ya está corriendo en http://localhost:3000
# Verificar que la página de login funciona
```

## 🔧 Comandos de Verificación

### Verificar conexión Firebase Admin (Backend):
```bash
curl -X POST http://localhost:3001/auth/firebase/verify \
  -H "Authorization: Bearer TU_FIREBASE_TOKEN"
```

### Verificar autenticación (Frontend):
- Abrir http://localhost:3000
- Ir a página de login
- Intentar registro/login con email

## 🚨 Troubleshooting

### Error: "Firebase Admin SDK not initialized"
- Verificar que todas las variables FIREBASE_* están en tu `.env.local` o exportadas en el entorno
- Verificar que el private key no tiene espacios extra

### Error: "Invalid private key"
- Asegurar que el private key está entre comillas dobles
- Verificar que los \n están en el string

### Error: "Project not found"
- Verificar FIREBASE_PROJECT_ID
- Verificar que el proyecto existe en Firebase Console

## ✅ Checklist de Configuración

- [ ] Proyecto Firebase creado
- [ ] Authentication habilitado (Email/Password)
- [ ] App web registrada en Firebase
- [ ] Service Account JSON descargado
- [ ] Variables frontend configuradas en .env.local
- [ ] Variables backend configuradas en `.env.local` (o cargadas desde el gestor de secretos)
- [ ] Backend inicia sin errores
- [ ] Frontend puede hacer login/registro

## 🔒 Seguridad

- ❌ NUNCA commits el service account JSON
- ❌ NUNCA expongas las variables FIREBASE_PRIVATE_KEY
- ✅ Usa variables de entorno para producción
- ✅ Configura Firebase Security Rules
- ✅ Habilita 2FA en tu cuenta Firebase

## 📚 Documentación Adicional

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Next.js con Firebase](https://firebase.google.com/docs/web/setup)
