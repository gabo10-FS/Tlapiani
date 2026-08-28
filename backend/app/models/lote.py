from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

ESTADOS_VALIDOS = ("Creado", "En Ruta", "Entregado Exitosamente", "Alerta de Manipulación")


class Lote(Base):
    __tablename__ = "lotes"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # Formato: TLAP-YYYY-XXXX
    tipo_bien: Mapped[str] = mapped_column(String(150), nullable=False)
    cantidad_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    origen_acopio: Mapped[str] = mapped_column(String(150), nullable=False)
    comunidad_destino_id: Mapped[int] = mapped_column(ForeignKey("comunidades.id"), nullable=False)
    estado_actual: Mapped[str] = mapped_column(String(50), default="Creado")  # ver ESTADOS_VALIDOS
    hash_sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    # Despacho a ruta — RF-1.4 / RF-2.3 (gap de diseño #2)
    transportista_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    despachado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LoteSecuencia(Base):
    """Contador atómico por año para generar IDs `TLAP-YYYY-XXXX` sin colisiones
    bajo solicitudes concurrentes (RNF-2.2). Ver app/services/integridad_service.py.
    """

    __tablename__ = "lote_secuencias"

    anio: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    ultimo_numero: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
