from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import ahora_utc
from app.db.base import Base


class CentroAcopio(Base):
    """Punto físico donde se reciben donaciones antes de despacharlas.

    Es el origen_acopio de un lote (app/models/lote.py::Lote.origen_acopio
    sigue siendo un string libre para no romper el contrato ya pinneado en
    integridad_service.py::generar_sello — este catálogo es para que el
    dashboard tenga de dónde elegir un nombre real, no una FK nueva).
    """

    __tablename__ = "centros_acopio"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    estado: Mapped[str] = mapped_column(String(100), nullable=False)
    latitud: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitud: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    capacidad: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=ahora_utc)
