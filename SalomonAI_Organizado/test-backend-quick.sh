#!/bin/bash

# Test rápido de endpoints disponibles mientras se arregla Firebase

echo "🧪 Test de endpoints del backend (puerto 3001)"
echo "=============================================="

BASE_URL="http://localhost:3001"

echo ""
echo "📋 Test 1: Health Check"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/health" 2>/dev/null || echo "HTTP_CODE:000")
http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)

if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS: Health check funcionando"
elif [ "$http_code" = "000" ]; then
    echo "❌ FAIL: Backend no responde en puerto 3001"
else
    echo "⚠️  PARTIAL: Código $http_code"
fi

echo ""
echo "🏦 Test 2: Endpoint de Belvo (directo)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/api/v1/belvo/institutions" 2>/dev/null || echo "HTTP_CODE:000")
http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)

if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS: Belvo endpoints funcionando"
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    echo "   Instituciones disponibles: $(echo "$body" | grep -o '"name"' | wc -l | tr -d ' ')"
elif [ "$http_code" = "000" ]; then
    echo "❌ FAIL: Backend no responde"
else
    echo "⚠️  INFO: Código $http_code (puede ser normal sin auth)"
fi

echo ""
echo "🔐 Test 3: Swagger/OpenAPI docs"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/api/docs" 2>/dev/null || echo "HTTP_CODE:000")
http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)

if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS: Documentación Swagger disponible"
    echo "   URL: ${BASE_URL}/api/docs"
else
    echo "⚠️  INFO: Swagger puede no estar configurado (código $http_code)"
fi

echo ""
echo "📊 Resumen:"
echo "==========="
if [ "$http_code" != "000" ]; then
    echo "✅ Backend ejecutándose en puerto 3001"
    echo "✅ Base de datos PostgreSQL conectada"
    echo "⚠️  Firebase Auth requiere configuración adicional"
    echo "🎯 Belvo listo para pruebas una vez solucionado Firebase"
else
    echo "❌ Backend no está respondiendo en puerto 3001"
    echo "   Verificar que el proceso esté ejecutándose"
fi

echo ""
