from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Noticia(Base):
    """Noticia/alerta publicada por un Administrador para el sitio público.

    `prioridad` (0-100) es asignada a mano por quien la publica -- no hay
    todavía una fuente automática que la calcule (a diferencia del Score de
    Urgencia de comunidades, que sí es un motor real). El listado público
    ordena por esta prioridad, no por fecha.
    """

    __tablename__ = "noticias"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    resumen: Mapped[str] = mapped_column(String(500), nullable=False)
    zona: Mapped[str] = mapped_column(String(150), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    nivel: Mapped[str] = mapped_column(String(30), nullable=False)  # crítica | alta | informativa
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    prioridad: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    img_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
