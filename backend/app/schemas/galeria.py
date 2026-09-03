from pydantic import BaseModel, ConfigDict

from app.schemas._tiempo import FechaUtcZ


class FotoComunidadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    comunidad_id: int
    url: str
    caption: str
    created_at: FechaUtcZ
