# Lineamientos de privacidad y cumplimiento normativo chileno

Estos lineamientos ayudan a alinear SalomónAI con la Ley Nº 19.628 sobre Protección
de la Vida Privada y las actualizaciones contempladas por la Ley Fintech chilena.
Servirán como base para auditorías de cumplimiento y acuerdos con entidades
financieras locales.

## Principios generales

1. **Licitud y consentimiento informado**
   - Registrar el consentimiento explícito de clientes y usuarios finales para el
     tratamiento de datos personales y sensibles, detallando finalidades y plazos.
   - Implementar flujos de *double opt-in* para la conexión con proveedores como Belvo
     u otros agregadores financieros.
2. **Minimización y finalidad específica**
   - Solo recolectar los atributos imprescindibles para análisis financieros y
     recomendaciones. Documentar la justificación en catálogos de datos.
   - Separar datasets de entrenamiento y producción para evitar reutilización no
     autorizada de información personal.
3. **Transparencia y derechos ARCO**
   - Publicar una política de privacidad accesible con canales para ejercer los
     derechos de acceso, rectificación, cancelación y oposición (ARCO).
   - Establecer SLA internos (máx. 10 días hábiles) para responder solicitudes ARCO y
     registrar el ciclo de vida de cada requerimiento.
4. **Responsabilidad demostrable**
   - Mantener registros de actividades de tratamiento (ROPA) y realizar evaluaciones
     de impacto cuando se incorporen nuevos modelos de ML o integraciones.
   - Versionar políticas y acuerdos de procesamiento con terceros, incluyendo proveedores
     cloud y servicios de voz.

## Anonimización y seudonimización

- Reemplazar identificadores directos (RUT, correos, teléfonos) por claves surrogate
  antes de mover datos a entornos de análisis o *sandbox*.
- Aplicar enmascaramiento irreversible para campos sensibles en logs (`****1234` en
  cuentas bancarias, últimas 4 cifras en tarjetas).
- Implementar funciones de *tokenization* para movimientos financieros, almacenando el
  diccionario de tokens en un almacén cifrado y con control de acceso restringido.
- Evaluar técnicas de agregación (ventanas temporales, *bucketing* de montos) cuando se
  publiquen métricas o datasets para equipos no autorizados.

## Retención y eliminación de datos

| Tipo de dato | Retención máxima | Estrategia |
| --- | --- | --- |
| Cartolas originales (PDF/imagen) | 12 meses | Almacenamiento cifrado en Supabase S3. Eliminar tras expirar el contrato o inactividad >12 meses. |
| Transacciones normalizadas | 5 años | Retener para auditoría financiera. Anonimizar después de 18 meses para entornos analíticos. |
| Registros de voz (audio crudo) | 30 días | Guardar solo para mejoras de modelos con consentimiento explícito. Destruir automáticamente pasado el plazo. |
| Logs de acceso/autenticación | 24 meses | Necesarios para trazabilidad y seguridad. Rotar a almacenamiento frío cifrado tras 6 meses. |

Implementar *jobs* programados que ejecuten borrados lógicos y físicos, notificando a
los equipos responsables y generando evidencia de cumplimiento.

## Transferencias internacionales

- Verificar que los proveedores cloud cuenten con cláusulas contractuales tipo o
  mecanismos equivalentes. Mantener inventario de ubicaciones (regiones AWS/GCP).
- Incluir en contratos cláusulas de confidencialidad y subprocesadores autorizados.
- Notificar a los titulares cuando sus datos se trasladen fuera de Chile y permitir la
  revocación de consentimiento.

## Seguridad y acceso

- Aplicar controles RBAC en Supabase/PostgreSQL y servicios internos; otorgar acceso
  mínimo necesario a analistas y desarrolladores.
- Cifrar datos en reposo y tránsito (TLS 1.3) y usar KMS para administrar llaves de
  cifrado simétricas.
- Registrar accesos administrativos y revisar reportes mensuales para detectar usos
  indebidos.
- Ejecutar pruebas de penetración enfocadas en fuga de datos y exposición indebida de
  información personal cada 12 meses o tras cambios mayores.

## Gobernanza y auditorías

- Designar un responsable de protección de datos (DPO) que supervise estos lineamientos
  y reporte avances al comité de cumplimiento.
- Documentar procedimientos de gestión de incidentes de privacidad, incluyendo
  notificaciones a la autoridad (Consejo para la Transparencia) en <72 horas.
- Integrar estos controles en el programa de seguridad descrito en `docs/SECURITY.md`
  y mantener evidencia en repositorios internos accesibles para auditorías.

## Checklist rápido

- [ ] Consentimiento informado almacenado y trazable.
- [ ] Registro de actividades de tratamiento actualizado.
- [ ] Tokens/seudónimos aplicados antes de mover datos fuera de producción.
- [ ] Políticas de retención configuradas y automatizadas.
- [ ] Controles de acceso revisados trimestralmente.
- [ ] Plan de respuesta a incidentes con simulacros documentados.
