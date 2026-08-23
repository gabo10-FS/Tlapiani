from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class Coordenadas(BaseModel):
    lat: Decimal
    lng: Decimal


class ComunidadPrioridadResponse(BaseModel):
    comunidad_id: int
    nombre: str
    estado: str
    score_urgencia: Decimal
    clasificacion: str
    coordenadas: Coordenadas
    alerta_activa: bool


class AlertaEmergenciaPayload(BaseModel):
    # Misma escala 0-100 que indice_marginacion/indice_pobreza — con gamma=0.2,
    # una alerta de severidad máxima (100) puede aportar hasta 20 puntos al
    # Score de Urgencia final. En escala 0-1 el aporte máximo sería 0.2 sobre
    # 100: casi sin efecto práctico, lo que contradice el propósito de RF-1.1.
    coeficiente_emergencia: Decimal = Field(ge=0, le=100)
    motivo: str = Field(min_length=1)
    activa: bool = True


class RecalculoResponse(BaseModel):
    comunidades_actualizadas: int
    timestamp: datetime


class ComunidadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    estado: str
    score_urgencia: Decimal
    clasificacion: str
    alerta_activa: bool
    alerta_motivo: str | None
    updated_at: datetime
