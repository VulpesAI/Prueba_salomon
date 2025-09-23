#!/bin/bash

# Script de configuración de PostgreSQL para SalomonAI
# Este script configura la base de datos necesaria para el proyecto

echo "🗄️  Configurando PostgreSQL para SalomonAI..."

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado. Instalando..."
    
    # Detectar el sistema operativo
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - usar Homebrew
        if command -v brew &> /dev/null; then
            brew install postgresql@15
            brew services start postgresql@15
        else
            echo "❌ Homebrew no está instalado. Por favor instala Homebrew primero:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - usar apt
        sudo apt update
        sudo apt install postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    else
        echo "❌ Sistema operativo no soportado automáticamente."
        echo "   Por favor instala PostgreSQL manualmente y ejecuta este script de nuevo."
        exit 1
    fi
fi

echo "✅ PostgreSQL está disponible"

# Configurar la base de datos
echo "🔧 Configurando base de datos 'salomonai_db'..."

# Crear usuario y base de datos
sudo -u postgres psql << EOF
-- Crear usuario salomonai
CREATE USER salomonai WITH PASSWORD 'salomonai_password';

-- Crear base de datos
CREATE DATABASE salomonai_db OWNER salomonai;

-- Dar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE salomonai_db TO salomonai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO salomonai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO salomonai;

-- Habilitar extensiones necesarias
\c salomonai_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector" CASCADE;

\q
EOF

if [ $? -eq 0 ]; then
    echo "✅ Base de datos configurada exitosamente"
    echo "📊 Detalles de la conexión:"
    echo "   Host: localhost"
    echo "   Puerto: 5432"
    echo "   Base de datos: salomonai_db"
    echo "   Usuario: salomonai"
    echo "   Contraseña: salomonai_password"
else
    echo "❌ Error configurando la base de datos"
    echo "💡 Intentando configuración alternativa para macOS..."
    
    # Configuración alternativa para macOS con usuario actual
    createdb salomonai_db 2>/dev/null || echo "Base de datos ya existe"
    
    if [ $? -eq 0 ]; then
        echo "✅ Base de datos creada con usuario actual"
        echo "📊 Detalles de la conexión:"
        echo "   Host: localhost"
        echo "   Puerto: 5432"
        echo "   Base de datos: salomonai_db"
        echo "   Usuario: $(whoami)"
        echo "   Contraseña: (sin contraseña)"
    fi
fi

echo ""
echo "🔍 Para verificar la conexión, ejecuta:"
echo "   psql -h localhost -p 5432 -U salomonai -d salomonai_db"
echo ""
echo "🚀 Siguiente paso: Configurar variables de entorno en el backend"
