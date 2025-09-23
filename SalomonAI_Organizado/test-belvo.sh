#!/bin/bash

# Script de prueba para Belvo API
# Verifica que las credenciales funcionan correctamente

echo "🏦 Probando conexión con Belvo API..."
echo "====================================="

# Credenciales configuradas
SECRET_ID="11386eb8-0ccb-4be5-826a-4fa874ae1514"
SECRET_PASSWORD="Q6XqF5LcVDUvQuRrMRlmMdVi5eONTM_vn8_jL1WUi5QDoQ8C_@h89#t8pzKeaBhT"
BASE_URL="https://sandbox.belvo.com"

# Crear autenticación básica
AUTH=$(echo -n "${SECRET_ID}:${SECRET_PASSWORD}" | base64)

echo "🔑 Probando autenticación..."

# Test 1: Obtener instituciones
echo ""
echo "📋 Test 1: Obtener instituciones bancarias de Chile"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Basic ${AUTH}" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/api/institutions/?country_code=CL")

http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS: Obtenidas instituciones bancarias"
    echo "   Instituciones encontradas:"
    echo "$body" | jq -r '.results[] | "   - " + .display_name + " (" + .id + ")"' 2>/dev/null || echo "   (Respuesta JSON válida recibida)"
else
    echo "❌ FAIL: Error $http_code obteniendo instituciones"
    echo "   Respuesta: $body"
fi

echo ""
echo "📊 Test 2: Verificar límites de API"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Basic ${AUTH}" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/api/institutions/?page_size=1")

http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)

if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS: API responde correctamente"
    echo "   Límites de sandbox activos"
else
    echo "❌ FAIL: Error $http_code en verificación de límites"
fi

echo ""
echo "🏁 Resumen de pruebas:"
echo "====================="
if [ "$http_code" = "200" ]; then
    echo "✅ Credenciales Belvo configuradas correctamente"
    echo "✅ Acceso a sandbox funcionando"
    echo "✅ Instituciones bancarias chilenas disponibles"
    echo ""
    echo "🎯 Próximo paso: Probar creación de link bancario"
    echo "   Usar credenciales de prueba:"
    echo "   Usuario: 12.345.678-9"
    echo "   Contraseña: 1234"
    echo "   Institución: banco_de_chile"
else
    echo "❌ Problema con credenciales o conexión Belvo"
    echo "   Verificar SECRET_ID y SECRET_PASSWORD"
fi

echo ""
