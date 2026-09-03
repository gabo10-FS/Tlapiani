from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import ahora_utc
from app.db.base import Base


class FotoComunidad(Base):
    """Foto real subida por un Administrador para una comunidad (galería).

    `url` guarda una ruta relativa (ej. "/uploads/galeria/<uuid>.jpg"), no
    una URL absoluta — el frontend la combina con API_BASE. El archivo en
    sí vive en disco bajo settings.UPLOAD_DIR (ver app/core/config.py y
    app/main.py, que monta esa carpeta como estáticos en /uploads).
    """

    __tablename__ = "fotos_comunidad"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    comunidad_id: Mapped[int] = mapped_column(Integer, ForeignKey("comunidades.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(255), nullable=False)
    caption: Mapped[str] = mapped_column(String(255), nullable=False)
    subido_por_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc)
