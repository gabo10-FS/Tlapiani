from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class NoticiaPayload(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    resumen: str = Field(min_length=1, max_length=500)
    zona: str = Field(min_length=1, max_length=150)
    fecha: date
    nivel: str = Field(min_length=1, max_length=30)
    tipo: str = Field(min_length=1, max_length=50)
    prioridad: int = Field(ge=0, le=100, default=50)
    img_url: str | None = None


class NoticiaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    resumen: str
    zona: str
    fecha: date
    nivel: str
    tipo: str
    prioridad: int
    img_url: str | None
    created_at: datetime
