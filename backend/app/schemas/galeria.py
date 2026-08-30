from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FotoComunidadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    comunidad_id: int
    url: str
    caption: str
    created_at: datetime
