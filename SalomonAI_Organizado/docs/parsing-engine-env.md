# Variables de entorno del Parsing Engine

El servicio `parsing-engine` necesita las siguientes variables para conectar con Kafka y recuperar los archivos desde Supabase Storage.

## Kafka

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `KAFKA_BROKERS` | Sí | Lista separada por comas con los brokers de Kafka (por ejemplo `kafka:9092,backup:9092`). |
| `STATEMENTS_IN_TOPIC` | Sí | Nombre del tópico desde el que se consumen los eventos de documentos cargados. Por defecto `statements.in`. |
| `STATEMENTS_OUT_TOPIC` | Sí | Tópico donde se publican los resultados normalizados (`parsed_statement`). Por defecto `statements.out`. |
| `PARSING_ENGINE_GROUP_ID` | No | Identificador del consumer group usado por el servicio. Default `parsing-engine`. |
| `PARSING_ENGINE_CONNECTION_RETRIES` | No | Número de reintentos para conectarse a Kafka antes de abortar. Default `5`. |
| `PARSING_ENGINE_RETRY_DELAY_SECONDS` | No | Segundos a esperar entre reintentos de conexión. Default `5`. |

## Supabase

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `SUPABASE_URL` | Sí (cuando se usa Supabase) | URL base del proyecto Supabase, por ejemplo `https://<instancia>.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (cuando se usa Supabase) | Llave `service_role` para autenticar contra la API REST y Storage. |
| `STATEMENTS_BUCKET` | No | Nombre del bucket de Supabase Storage donde se guardan los estados de cuenta. Default `statements`. |

Si no se definen `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, el servicio intentará leer los archivos directamente desde el sistema de archivos utilizando la ruta recibida en el evento.

## Opcionales

| Variable | Descripción |
| --- | --- |
| `DEFAULT_CURRENCY` | Moneda que se asignará a las transacciones cuando el documento no incluya información explícita. Default `CLP`. |
| `OCR_LANGUAGES` | Códigos de idiomas soportados por Tesseract para el OCR. Se recomienda `spa+eng` para español e inglés. |

