from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class RegistroLotePayload(BaseModel):
    tipo_bien: str
    cantidad_kg: Decimal
    comunidad_destino_id: int
    origen_acopio: str


class RegistroLoteResponse(BaseModel):
    lote_id: str
    status: str
    hash_sha256: str
    timestamp_creacion: datetime


class DespacharLotePayload(BaseModel):
    transportista_id: int
    notas: str | None = None


class DespacharLoteResponse(BaseModel):
    lote_id: str
    estado_actual: str
    transportista_id: int
    despachado_en: datetime


class MovimientoBitacora(BaseModel):
    estado: str
    timestamp: datetime
    detalle: str


class HistorialLoteResponse(BaseModel):
    lote_id: str
    tipo_bien: str
    cantidad_kg: Decimal
    origen_acopio: str
    comunidad_destino: str
    hash_origen: str
    estado_actual: str
    bitacora_movimientos: list[MovimientoBitacora]
