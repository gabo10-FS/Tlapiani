from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Historia(Base):
    """Caso de éxito / testimonio publicado por un Administrador.

    `comunidad` es texto libre (no FK a comunidades.id) a propósito: una
    historia puede hablar de una comunidad que ya no existe en el catálogo,
    de varias, o de una zona más amplia que una sola comunidad registrada.
    """

    __tablename__ = "historias"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    comunidad: Mapped[str] = mapped_column(String(150), nullable=False)
    resumen: Mapped[str] = mapped_column(String(500), nullable=False)
    cita: Mapped[str] = mapped_column(String(500), nullable=False)
    autor: Mapped[str] = mapped_column(String(150), nullable=False)
    impacto: Mapped[str] = mapped_column(String(100), nullable=False)
    img_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
