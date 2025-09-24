# Guía de Configuración de Belvo para SalomonAI

## 🏦 Configuración Paso a Paso de Belvo

### 1. Registro en Belvo

1. **Crear cuenta**: Ve a https://belvo.com/ y regístrate
2. **Verificar email**: Confirma tu cuenta via email
3. **Completar perfil**: Proporciona información de tu empresa
4. **Solicitar acceso**: Belvo puede requerir aprobación para cuentas de producción

### 2. Obtener Credenciales de Sandbox

1. **Acceder al Dashboard**: https://dashboard.belvo.com/
2. **Ir a Settings > API Keys**
3. **Crear nuevas credenciales de Sandbox**:
   - Secret ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Secret Password: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Configurar Variables de Entorno

#### Backend (`.env.local` o gestor de secretos):
```bash
# Belvo Configuration
BELVO_SECRET_ID=tu-belvo-secret-id-de-sandbox
BELVO_SECRET_PASSWORD=tu-belvo-secret-password-de-sandbox
BELVO_ENVIRONMENT=sandbox  # o production cuando tengas aprobación
```

### 4. Instituciones Bancarias Soportadas en Chile

Belvo soporta las principales instituciones financieras de Chile:

#### Bancos Principales:
- **Banco de Chile** (`banco_de_chile`)
- **BancoEstado** (`bancoestado`)
- **Santander Chile** (`santander_chile`)
- **BCI** (`bci`)
- **Banco Falabella** (`banco_falabella`)
- **Banco Scotiabank** (`scotiabank_chile`)
- **BBVA Chile** (`bbva_chile`)
- **Banco Ripley** (`banco_ripley`)
- **Banco Security** (`banco_security`)
- **Banco Consorcio** (`banco_consorcio`)

#### Cooperativas y Otros:
- **Coopeuch** (`coopeuch`)
- **Cajas de Compensación**

### 5. Flujo de Conexión Bancaria

#### 5.1 Obtener Instituciones Disponibles:
```bash
curl -X GET "http://localhost:3001/belvo/institutions?country=CL" \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

#### 5.2 Crear Conexión Bancaria:
```bash
curl -X POST "http://localhost:3001/belvo/connections" \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "institution": "banco_de_chile",
    "username": "tu_rut_sin_puntos",
    "password": "tu_clave_del_banco"
  }'
```

#### 5.3 Sincronizar Transacciones:
```bash
curl -X POST "http://localhost:3001/belvo/connections/{connection-id}/sync?days=30" \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 6. Manejo de Credenciales Bancarias

#### ⚠️ Importante - Seguridad:
- **SalomonAI NO almacena** credenciales bancarias
- Las credenciales se envían directamente a Belvo
- Belvo maneja la encriptación y seguridad
- Nosotros solo almacenamos el "link ID" de Belvo

#### Datos que SÍ almacenamos:
- Link ID de Belvo
- Metadatos de la institución (nombre, logo)
- Estado de la conexión
- Contadores de sincronización
- Errores de conexión (sin credenciales)

### 7. Testing con Cuentas de Prueba

Belvo proporciona cuentas de prueba para desarrollo:

#### Banco de Chile (Sandbox):
```
Usuario: 12.345.678-9
Contraseña: 1234
```

#### BancoEstado (Sandbox):
```
Usuario: 12345678
Contraseña: 1234
```

#### Santander Chile (Sandbox):
```
Usuario: 12345678-9
Contraseña: 1234
```

### 8. Endpoints Principales Implementados

#### Gestión de Instituciones:
- `GET /belvo/institutions` - Listar bancos disponibles

#### Gestión de Conexiones:
- `POST /belvo/connections` - Conectar cuenta bancaria
- `GET /belvo/connections` - Listar conexiones del usuario
- `GET /belvo/connections/:id` - Detalles de conexión específica
- `DELETE /belvo/connections/:id` - Desconectar cuenta

#### Sincronización:
- `POST /belvo/connections/:id/sync` - Sincronizar transacciones
- `POST /belvo/sync-all` - Sincronizar todas las conexiones
- `GET /belvo/stats` - Estadísticas de sincronización

#### Datos Bancarios:
- `GET /belvo/connections/:id/accounts` - Cuentas de la conexión
- `GET /belvo/connections/:id/balances` - Balances actuales

### 9. Proceso de Sincronización Automática

1. **Conexión inicial**: Usuario conecta su cuenta bancaria
2. **Sincronización de cuentas**: Se obtienen las cuentas disponibles
3. **Sincronización de transacciones**: Se importan los movimientos históricos
4. **Sincronización periódica**: Cada 24 horas (configurable)
5. **Manejo de errores**: Sistema de reintentos y notificaciones

### 10. Categorización Automática

Las transacciones de Belvo vienen con categorías que mapeamos:

```javascript
Belvo Category → SalomonAI Category
'Food & Groceries' → 'Alimentación'
'Transportation' → 'Transporte'
'Shopping' → 'Compras'
'Entertainment' → 'Entretenimiento'
'Bills & Utilities' → 'Servicios'
'Health & Medical' → 'Salud'
// ... más categorías
```

### 11. Monitoreo y Health Checks

#### Estados de Conexión:
- **active**: Conexión funcionando correctamente
- **invalid**: Credenciales inválidas o expiradas
- **unconfirmed**: Esperando confirmación del banco
- **token_refresh**: Necesita renovación de token

#### Métricas de Salud:
- Número de errores consecutivos
- Última sincronización exitosa
- Número de cuentas conectadas
- Frecuencia de sincronización

### 12. Troubleshooting

#### Error: "Invalid credentials"
- Verificar usuario y contraseña del banco
- Algunos bancos requieren formato específico (RUT sin puntos)

#### Error: "Institution not found"
- Verificar que el ID de institución sea correcto
- Consultar lista actualizada de instituciones

#### Error: "Connection timeout"
- Reintentar la conexión
- Verificar estado del servicio Belvo

#### Error: "Account locked"
- Usuario puede tener cuenta bloqueada en el banco
- Solicitar desbloqueo directamente con el banco

### 13. Límites y Quotas

#### Sandbox:
- 100 requests por minuto
- 1000 requests por día
- Datos limitados a cuentas de prueba

#### Producción:
- Límites según plan contratado
- Instituciones reales disponibles
- Datos bancarios reales

### 14. Consideraciones de Producción

1. **Compliance**: Belvo cumple con regulaciones financieras
2. **Encriptación**: Todas las comunicaciones están encriptadas
3. **Monitoreo**: Implementar logging de errores y métricas
4. **Backup**: Sincronización regular para redundancia
5. **Rate Limiting**: Respetar límites de API de Belvo

### 15. Próximos Pasos

1. **Configurar credenciales de Belvo** en archivo `.env.local` (o cargar desde el gestor de secretos)
2. **Probar conexiones con cuentas sandbox**
3. **Implementar notificaciones** de errores de sincronización
4. **Optimizar frecuencia** de sincronización según uso
5. **Solicitar acceso a producción** cuando esté listo

## 🔗 Recursos Adicionales

- [Documentación Belvo](https://developers.belvo.com/)
- [Dashboard Belvo](https://dashboard.belvo.com/)
- [Status Page Belvo](https://status.belvo.com/)
- [Postman Collection](https://www.postman.com/belvo-api)

## ✅ Checklist de Configuración Belvo

- [ ] Cuenta Belvo creada y verificada
- [ ] Credenciales de sandbox obtenidas
- [ ] Variables BELVO_* configuradas en `.env.local` (o cargadas desde el gestor de secretos)
- [ ] Backend inicia sin errores de Belvo
- [ ] Test de conexión con cuenta sandbox exitoso
- [ ] Sincronización de transacciones funcionando
- [ ] Dashboard muestra datos de Belvo correctamente
