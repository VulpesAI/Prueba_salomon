# OCR Processor Service

Servicio FastAPI encargado de procesar boletas o comprobantes mediante OCR y entregar transacciones normalizadas listas para sincronizar con `core-api`.

## Características principales

- API REST (`POST /v1/ocr/process`) que acepta imágenes en formato multipart o como Base64.
- Motores OCR intercambiables (Tesseract local o AWS Textract) seleccionables vía variables de entorno.
- Normalización de texto a entidades de transacciones con detección de fechas, montos y descripciones.
- Canal CORS abierto para facilitar pruebas desde clientes web o móviles.

## Variables de entorno

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `OCR_ENGINE` | Motor a utilizar (`tesseract`, `textract`, `stub`) | `tesseract` |
| `OCR_ENGINE_STRICT` | Si es `true`, falla cuando el motor seleccionado no está disponible | `false` |
| `AWS_REGION` | Región AWS para Textract | `None` |
| `AWS_TEXTRACT_ENDPOINT` | Endpoint personalizado para Textract | `None` |

## Ejecución local

```bash
cd services/ocr-processor
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Luego, realiza una petición:

```bash
curl -X POST \
  -F "file=@/ruta/a/boleta.png" \
  http://localhost:8080/v1/ocr/process
```

## Pruebas

```bash
pytest
```
