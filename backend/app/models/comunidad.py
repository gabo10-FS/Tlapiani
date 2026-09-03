from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import ahora_utc
from app.db.base import Base


class Comunidad(Base):
    __tablename__ = "comunidades"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    estado: Mapped[str] = mapped_column(String(100), nullable=False)
    latitud: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitud: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)

    # Variables del Score de Urgencia — RF-1.1
    indice_marginacion: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    indice_pobreza: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    coeficiente_emergencia: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    score_urgencia: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    clasificacion: Mapped[str] = mapped_column(String(50), default="Prioridad Baja")

    # Ingesta de alertas CENAPRED (gap de diseño #3) — endpoint administrativo manual
    # que ajusta coeficiente_emergencia; estos dos campos son de auditoría/UI.
    alerta_activa: Mapped[bool] = mapped_column(default=False)
    alerta_motivo: Mapped[str | None] = mapped_column(String(255), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=ahora_utc, onupdate=ahora_utc
    )
