from decimal import Decimal

from pydantic import BaseModel


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
