from __future__ import annotations

import base64
import io
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)


class EngineUnavailableError(RuntimeError):
    """Raised when an OCR engine cannot operate in the current environment."""


class BaseOcrEngine(ABC):
    name: str

    @abstractmethod
    async def extract_text(self, image: Image.Image) -> str:
        raise NotImplementedError


@dataclass
class OcrEngineConfig:
    name: str
    aws_region: Optional[str] = None
    aws_endpoint_url: Optional[str] = None
    strict: bool = False


class TesseractEngine(BaseOcrEngine):
    name = "tesseract"

    def __init__(self) -> None:
        try:
            import pytesseract  # type: ignore

            self._tesseract = pytesseract
        except Exception as exc:  # pragma: no cover - import error path
            raise EngineUnavailableError("pytesseract no está disponible") from exc

    async def extract_text(self, image: Image.Image) -> str:
        return self._tesseract.image_to_string(image)


class AwsTextractEngine(BaseOcrEngine):
    name = "textract"

    def __init__(self, config: OcrEngineConfig) -> None:
        try:
            import boto3  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise EngineUnavailableError("boto3 no está disponible") from exc

        self._client = boto3.client(
            "textract",
            region_name=config.aws_region,
            endpoint_url=config.aws_endpoint_url,
        )

    async def extract_text(self, image: Image.Image) -> str:
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        response = self._client.detect_document_text(Document={"Bytes": buffer.getvalue()})
        lines = [item["DetectedText"] for item in response.get("Blocks", []) if item.get("BlockType") == "LINE"]
        return "\n".join(lines)


class Base64StubEngine(BaseOcrEngine):
    """Fallback engine that simply decodes base64 text payloads."""

    name = "stub"

    async def extract_text(self, image: Image.Image) -> str:  # pragma: no cover - deterministic placeholder
        return ""

    async def extract_text_from_base64(self, content: str) -> str:
        try:
            decoded = base64.b64decode(content)
            return decoded.decode("utf-8", errors="ignore")
        except Exception:  # pragma: no cover - defensive
            return ""


def build_engine(config: OcrEngineConfig) -> BaseOcrEngine:
    name = (config.name or "").lower() or TesseractEngine.name
    logger.info("Inicializando motor OCR '%s'", name)

    if name == TesseractEngine.name:
        try:
            return TesseractEngine()
        except EngineUnavailableError as exc:
            if config.strict:
                raise
            logger.warning("Motor Tesseract no disponible, se utilizará stub: %s", exc)
            return Base64StubEngine()

    if name == AwsTextractEngine.name:
        try:
            return AwsTextractEngine(config)
        except EngineUnavailableError as exc:
            if config.strict:
                raise
            logger.warning("AWS Textract no disponible, se utilizará stub: %s", exc)
            return Base64StubEngine()

    logger.warning("Motor desconocido '%s', se utilizará stub.", name)
    return Base64StubEngine()
