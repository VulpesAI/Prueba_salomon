FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias de sistema necesarias
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

# Copiar los archivos de definición de dependencias
COPY package*.json ./

# Instalar dependencias incluyendo las de desarrollo
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar la aplicación
RUN npm run build

# Producción
FROM node:20-slim

WORKDIR /app

# Instalar curl para healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copiar solo los archivos necesarios desde el builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f "http://localhost:${PORT}/health" || exit 1

# Comando por defecto
CMD ["node", "dist/main.js"]
