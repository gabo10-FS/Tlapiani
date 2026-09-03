from decimal import Decimal

from pydantic import BaseModel

from app.schemas._tiempo import FechaUtcZ


class RegistroLotePayload(BaseModel):
    tipo_bien: str
    cantidad_kg: Decimal
    comunidad_destino_id: int
    origen_acopio: str


class RegistroLoteResponse(BaseModel):
    lote_id: str
    status: str
    hash_sha256: str
    timestamp_creacion: FechaUtcZ


class LoteResumenResponse(BaseModel):
    """Fila del listado de lotes (`GET /donaciones`). Trae lo que el dashboard
    necesita para el inventario y el selector de despacho, sin la bitácora
    completa (eso lo da `GET /donaciones/historial/{lote_id}`)."""

    lote_id: str
    tipo_bien: str
    cantidad_kg: Decimal
    origen_acopio: str
    comunidad_destino_id: int
    comunidad_destino_nombre: str
    comunidad_destino_estado: str
    estado_actual: str
    hash_sha256: str
    transportista_id: int | None
    created_at: FechaUtcZ
    despachado_en: FechaUtcZ | None


class DespacharLotePayload(BaseModel):
    transportista_id: int
    notas: str | None = None


class DespacharLoteResponse(BaseModel):
    lote_id: str
    estado_actual: str
    transportista_id: int
    despachado_en: FechaUtcZ


class MovimientoBitacora(BaseModel):
    estado: str
    timestamp: FechaUtcZ
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
