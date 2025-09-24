#!/bin/bash

# Script de configuración completa del entorno SalomonAI
# Este script automatiza la configuración inicial del proyecto

set -e  # Salir si hay algún error

echo "🚀 Configurando entorno completo de SalomonAI..."
echo "================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/services/core-api"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Paso 1: Verificar herramientas necesarias
print_step "Verificando herramientas necesarias..."

# Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instala Node.js 18+ desde https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    print_success "Node.js instalado: $NODE_VERSION"
fi

# npm
if ! command -v npm &> /dev/null; then
    print_error "npm no está disponible"
    exit 1
else
    NPM_VERSION=$(npm --version)
    print_success "npm instalado: $NPM_VERSION"
fi

# Paso 2: Configurar backend
print_step "Configurando backend..."

cd "$BACKEND_DIR"

# Generar plantillas locales adicionales
if [ -x "$PROJECT_DIR/secrets/bootstrap-local-env.sh" ]; then
    print_step "Generando archivos .env.local desde plantillas..."
    (cd "$PROJECT_DIR" && ./secrets/bootstrap-local-env.sh >/dev/null || true)
fi

# Instalar dependencias del backend si no existen
if [ ! -d "node_modules" ]; then
    print_step "Instalando dependencias del backend..."
    npm install
    print_success "Dependencias del backend instaladas"
else
    print_success "Dependencias del backend ya instaladas"
fi

# Crear archivo .env.local si no existe
if [ ! -f ".env.local" ]; then
    print_step "Creando archivo .env.local del backend..."

    # Generar JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    API_KEY=$(openssl rand -hex 16)

    cat > .env.local << EOF
# Configuración de Base de Datos
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=$(whoami)
DATABASE_PASSWORD=
DATABASE_NAME=salomonai_db

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# API
API_KEY=$API_KEY

# Servidor
PORT=3001
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=debug

# Firebase (CONFIGURAR MANUALMENTE)
# FIREBASE_PROJECT_ID=tu-proyecto-firebase
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_KEY\n-----END PRIVATE KEY-----\n"
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com

# Qdrant
QDRANT_URL=http://localhost:6333
EOF

    print_success "Archivo .env.local creado con valores básicos"
    print_warning "⚠️  IMPORTANTE: Debes configurar manualmente las variables de Firebase en .env.local o usarlas desde el gestor de secretos"
else
    print_success "Archivo .env.local del backend ya existe"
fi

# Paso 3: Configurar frontend
print_step "Configurando frontend..."

cd "$FRONTEND_DIR"

# Crear archivo .env.local si no existe
if [ ! -f ".env.local" ]; then
    print_step "Creando archivo .env.local del frontend..."
    
    cat > .env.local << EOF
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001

# Firebase (CONFIGURAR MANUALMENTE)
# NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
# NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Entorno
NODE_ENV=development
EOF

    print_success "Archivo .env.local del frontend creado"
    print_warning "⚠️  IMPORTANTE: Debes configurar las variables de Firebase en .env.local"
else
    print_success "Archivo .env.local del frontend ya existe"
fi

# Paso 4: Información de configuración de Firebase
print_step "Instrucciones para configurar Firebase..."

echo ""
echo "🔥 CONFIGURACIÓN DE FIREBASE REQUERIDA:"
echo "========================================="
echo ""
echo "1. Ve a Firebase Console: https://console.firebase.google.com/"
echo "2. Crea un nuevo proyecto o usa uno existente"
echo "3. Habilita Authentication > Sign-in method > Email/Password"
echo "4. Ve a Project Settings > Service accounts"
echo "5. Genera una nueva clave privada y descarga el JSON"
echo "6. Copia los valores del JSON a tus archivos .env.local o gestiona los secretos en la herramienta oficial"
echo ""
echo "Backend (.env.local):"
echo "   FIREBASE_PROJECT_ID=valor_del_json"
echo "   FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\nkey_content\\n-----END PRIVATE KEY-----\\n\""
echo "   FIREBASE_CLIENT_EMAIL=email_del_json"
echo ""
echo "Frontend (.env.local):"
echo "   NEXT_PUBLIC_FIREBASE_API_KEY=valor_de_project_settings"
echo "   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=proyecto.firebaseapp.com"
echo "   NEXT_PUBLIC_FIREBASE_PROJECT_ID=valor_del_proyecto"
echo ""

# Paso 5: Verificar/crear base de datos
print_step "Configurando base de datos..."

# Verificar si PostgreSQL está disponible
if command -v psql &> /dev/null; then
    # Intentar crear la base de datos
    createdb salomonai_db 2>/dev/null && print_success "Base de datos 'salomonai_db' creada" || print_warning "Base de datos 'salomonai_db' ya existe o no se pudo crear"
    
    # Verificar conexión
    if psql -d salomonai_db -c "SELECT 1;" &>/dev/null; then
        print_success "Conexión a base de datos verificada"
    else
        print_warning "No se pudo verificar la conexión a la base de datos"
    fi
else
    print_warning "PostgreSQL no está instalado"
    echo ""
    echo "Para instalar PostgreSQL:"
    echo "  macOS: brew install postgresql@15"
    echo "  Linux: sudo apt install postgresql"
    echo ""
fi

# Paso 6: Resumen final
echo ""
echo "🎉 CONFIGURACIÓN COMPLETADA"
echo "=========================="
print_success "Frontend: http://localhost:3000 (ya corriendo)"
print_success "Backend: http://localhost:3001 (listo para iniciar)"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Configurar Firebase (ver instrucciones arriba)"
echo "2. Iniciar backend: cd services/core-api && npm run start:dev"
echo "3. Probar endpoints con Postman o curl"
echo ""
echo "🔧 ARCHIVOS IMPORTANTES:"
echo "   Backend .env: $BACKEND_DIR/.env"
echo "   Frontend .env.local: $FRONTEND_DIR/.env.local"
echo "   Configuración DB: $PROJECT_DIR/setup-database.sh"
echo ""
print_success "¡Entorno configurado exitosamente!"
