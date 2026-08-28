from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EnvioBitacora(Base):
    """Bitácora inmutable de entregas — RNF-1.1. Las triggers que bloquean
    UPDATE/DELETE se crean en migrations/versions/0001_initial_schema.py,
    no se pueden expresar a nivel de modelo SQLAlchemy.
    """

    __tablename__ = "envios_bitacora"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lote_id: Mapped[str] = mapped_column(ForeignKey("lotes.id"), nullable=False)
    hash_origen: Mapped[str] = mapped_column(String(64), nullable=False)
    hash_calculado_recepcion: Mapped[str] = mapped_column(String(64), nullable=False)
    integridad_validada: Mapped[bool] = mapped_column(Boolean, nullable=False)
    timestamp_entrega: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    receptor_firma_id: Mapped[str] = mapped_column(String(50), nullable=False)
    dispositivo_uuid: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
