from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CentroAcopioPayload(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    estado: str = Field(min_length=1, max_length=100)
    latitud: Decimal
    longitud: Decimal
    capacidad: str = Field(min_length=1, max_length=100)


class CentroAcopioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    estado: str
    latitud: Decimal
    longitud: Decimal
    capacidad: str
