"""RF-3.4 — consolidar_entrega recalcula integridad_validada server-side.

Estos tests no usan AsyncSession real: solo verifican la lógica de decisión
(defensa en profundidad) sin tocar la base de datos, con un stub mínimo.
"""

from datetime import datetime, timezone

import pytest

from app.schemas.envio import EntregaSincronizada
from app.services.sync_service import consolidar_entrega


class _DBStub:
    """Reemplaza AsyncSession lo justo para que consolidar_entrega corra."""

    def __init__(self, lote=None):
        self._lote = lote
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def get(self, _model, _pk):
        return self._lote


class _LoteStub:
    def __init__(self):
        self.estado_actual = "En Ruta"


def _entrega(hash_origen: str, hash_recepcion: str, integridad_reportada: bool) -> EntregaSincronizada:
    return EntregaSincronizada(
        lote_id="TLAP-2026-9981",
        hash_origen=hash_origen,
        hash_calculado_recepcion=hash_recepcion,
        integridad_validada=integridad_reportada,
        timestamp_entrega=datetime(2026, 6, 29, 6, 30, 0, tzinfo=timezone.utc),
        receptor_firma_id="CURP_RECEPTOR_VALIDADO",
    )


@pytest.mark.asyncio
async def test_hashes_coinciden_y_dispositivo_reporta_ok_marca_entregado():
    lote = _LoteStub()
    db = _DBStub(lote=lote)
    entrega = _entrega("abc123", "abc123", integridad_reportada=True)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is True
    assert lote.estado_actual == "Entregado Exitosamente"
    assert db.added[0].integridad_validada is True


@pytest.mark.asyncio
async def test_hashes_no_coinciden_fuerza_alerta_aunque_dispositivo_reporte_ok():
    """Defensa en profundidad: un dispositivo comprometido/con bug que reporta
    integridad_validada=true no puede forzar un 'Entregado Exitosamente' si los
    hashes en el payload no coinciden."""
    lote = _LoteStub()
    db = _DBStub(lote=lote)
    entrega = _entrega("abc123", "distinto456", integridad_reportada=True)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is False
    assert lote.estado_actual == "Alerta de Manipulación"
    assert db.added[0].integridad_validada is False


@pytest.mark.asyncio
async def test_dispositivo_reporta_fallo_aunque_hashes_coincidan_respeta_el_reporte():
    lote = _LoteStub()
    db = _DBStub(lote=lote)
    entrega = _entrega("abc123", "abc123", integridad_reportada=False)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is False
    assert lote.estado_actual == "Alerta de Manipulación"


@pytest.mark.asyncio
async def test_lote_inexistente_no_rompe_pero_no_actualiza_estado():
    db = _DBStub(lote=None)
    entrega = _entrega("abc123", "abc123", integridad_reportada=True)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is True
    assert len(db.added) == 1
