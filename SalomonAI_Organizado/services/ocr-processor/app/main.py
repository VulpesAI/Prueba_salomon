from __future__ import annotations

import base64
import io
import logging
import os
from typing import Optional

from fastapi import Body, Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from .engines import Base64StubEngine, OcrEngineConfig, build_engine
from .normalizer import normalize_lines
from .schemas import OcrProcessingRequest, OcrProcessingResponse

logger = logging.getLogger(__name__)
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

app = FastAPI(title="SalomonAI OCR Processor", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_engine():
    engine_name = os.environ.get("OCR_ENGINE", "tesseract")
    strict = os.environ.get("OCR_ENGINE_STRICT", "false").lower() == "true"
    config = OcrEngineConfig(
        name=engine_name,
        aws_region=os.environ.get("AWS_REGION"),
        aws_endpoint_url=os.environ.get("AWS_TEXTRACT_ENDPOINT"),
        strict=strict,
    )
    return build_engine(config)


def load_image_from_bytes(content: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail=f"Imagen inválida: {exc}") from exc


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}


@app.post("/v1/ocr/process", response_model=OcrProcessingResponse)
async def process_ocr(
    file: Optional[UploadFile] = File(default=None),
    request: Optional[OcrProcessingRequest] = Body(default=None),
    engine=Depends(get_engine),
):
    if file is None and (request is None or not request.image_base64):
        raise HTTPException(status_code=400, detail="Se requiere un archivo o imagen en base64")

    currency = request.currency if request else "MXN"
    metadata = request.metadata if request else None

    image_bytes: Optional[bytes] = None
    if file is not None:
        image_bytes = await file.read()
    elif request and request.image_base64:
        try:
            image_bytes = base64.b64decode(request.image_base64)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Base64 inválido: {exc}") from exc

    if not image_bytes:
        raise HTTPException(status_code=400, detail="No se pudo leer la imagen")

    image = load_image_from_bytes(image_bytes)

    try:
        raw_text = await engine.extract_text(image)
    except AttributeError:
        # Stub engine sin implementación real
        if isinstance(engine, Base64StubEngine) and request and request.image_base64:
            raw_text = await engine.extract_text_from_base64(request.image_base64)
        else:
            raise HTTPException(status_code=500, detail="El motor OCR no pudo procesar la imagen")
    except Exception as exc:  # pragma: no cover - fallback
        logger.exception("Error procesando OCR: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not raw_text and isinstance(engine, Base64StubEngine) and request and request.image_base64:
        raw_text = await engine.extract_text_from_base64(request.image_base64)

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    transactions = normalize_lines(lines, currency=currency or "MXN")

    return OcrProcessingResponse(
        engine=getattr(engine, "name", "unknown"),
        raw_text=raw_text,
        transactions=[
            {
                "description": t.description,
                "amount": t.amount,
                "currency": t.currency,
                "date": t.date,
            }
            for t in transactions
        ],
        metadata={
            "currency": currency,
            "total_transactions": len(transactions),
            "source": "file" if file is not None else "base64",
            "requestMetadata": metadata or {},
        },
    )
