from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class OcrTransaction(BaseModel):
    description: str = Field(..., description="Descripción encontrada en la boleta")
    amount: float = Field(..., description="Monto detectado")
    currency: str = Field(..., description="Moneda inferida o seleccionada")
    date: Optional[str] = Field(None, description="Fecha detectada en formato ISO 8601")


class OcrProcessingRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Imagen codificada en base64")
    currency: Optional[str] = Field("MXN", description="Moneda preferida para las transacciones")
    metadata: Optional[dict] = Field(default=None, description="Metadatos adicionales")


class OcrProcessingResponse(BaseModel):
    engine: str
    raw_text: str
    transactions: List[OcrTransaction]
    metadata: dict
