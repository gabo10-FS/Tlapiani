from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HistoriaPayload(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    comunidad: str = Field(min_length=1, max_length=150)
    resumen: str = Field(min_length=1, max_length=500)
    cita: str = Field(min_length=1, max_length=500)
    autor: str = Field(min_length=1, max_length=150)
    impacto: str = Field(min_length=1, max_length=100)
    img_url: str | None = None


class HistoriaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    comunidad: str
    resumen: str
    cita: str
    autor: str
    impacto: str
    img_url: str | None
    created_at: datetime
