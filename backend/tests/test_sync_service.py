"""RF-3.4 — consolidar_entrega recalcula integridad_validada server-side.

Estos tests no usan AsyncSession real: verifican la lógica de decisión
(defensa en profundidad) con un stub mínimo de sesión y objetos `Lote` reales
del modelo, para poder recalcular el sello con `generar_sello` tal como lo hace
el servicio.
"""

from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models.lote import Lote
from app.schemas.envio import EntregaSincronizada
from app.services.integridad_service import generar_sello
from app.services.sync_service import consolidar_entrega

_TS_CREACION = datetime(2026, 6, 29, 9, 15, 0, tzinfo=timezone.utc)
_HASH_FALSO = "f" * 64  # par de hashes iguales entre sí pero que no es ningún sello real


class _DBStub:
    """Reemplaza AsyncSession lo justo para que consolidar_entrega corra."""

    def __init__(self, lote=None):
        self._lote = lote
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def get(self, _model, _pk):
        return self._lote


def _lote_real() -> Lote:
    return Lote(
        id="TLAP-2026-9981",
        tipo_bien="Canasta Básica Alimentos",
        cantidad_kg=Decimal("25.0"),
        origen_acopio="Centro de Acopio Puebla Centro",
        comunidad_destino_id=21005,
        estado_actual="En Ruta",
        hash_sha256="irrelevante-para-estos-tests",
        created_at=_TS_CREACION,
    )


def _sello_de(lote: Lote) -> str:
    return generar_sello(
        lote.id, lote.tipo_bien, lote.cantidad_kg, lote.comunidad_destino_id, lote.created_at
    )


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
async def test_sello_real_y_dispositivo_ok_marca_entregado():
    lote = _lote_real()
    db = _DBStub(lote=lote)
    sello = _sello_de(lote)
    entrega = _entrega(sello, sello, integridad_reportada=True)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is True
    assert lote.estado_actual == "Entregado Exitosamente"
    assert db.added[0].integridad_validada is True


@pytest.mark.asyncio
async def test_hashes_del_payload_no_coinciden_fuerza_alerta_aunque_dispositivo_reporte_ok():
    """Un dispositivo comprometido/con bug que reporta integridad_validada=true
    no puede forzar un 'Entregado Exitosamente' si los hashes del payload no
    coinciden entre sí."""
    lote = _lote_real()
    db = _DBStub(lote=lote)
    sello = _sello_de(lote)
    entrega = _entrega(sello, "distinto456", integridad_reportada=True)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is False
    assert lote.estado_actual == "Alerta de Manipulación"
    assert db.added[0].integridad_validada is False


@pytest.mark.asyncio
async def test_par_de_hashes_iguales_pero_no_es_el_sello_real_se_detecta_como_manipulacion():
    """El caso central de la defensa en profundidad: el cliente manda
    hash_origen == hash_calculado_recepcion (los dos iguales entre sí) y reporta
    integridad_validada=true, pero el valor NO corresponde al sello real del
    lote guardado en BD. El servidor lo recalcula y lo detecta como
    manipulación."""
    lote = _lote_real()
    db = _DBStub(lote=lote)
    entrega = _entrega(_HASH_FALSO, _HASH_FALSO, integridad_reportada=True)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is False
    assert lote.estado_actual == "Alerta de Manipulación"
    assert db.added[0].integridad_validada is False


@pytest.mark.asyncio
async def test_dispositivo_reporta_fallo_aunque_todo_lo_demas_cuadre_respeta_el_reporte():
    lote = _lote_real()
    db = _DBStub(lote=lote)
    sello = _sello_de(lote)
    entrega = _entrega(sello, sello, integridad_reportada=False)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is False
    assert lote.estado_actual == "Alerta de Manipulación"
    assert db.added[0].integridad_validada is False


@pytest.mark.asyncio
async def test_sello_recalculado_detecta_lote_alterado_en_bd():
    """Si algún dato del lote en BD no es el que se usó para firmar (aquí la
    cantidad), el sello del cliente —aunque sea el sello legítimo original— ya
    no coincide con el recalculado y se marca alerta."""
    lote = _lote_real()
    sello_original = _sello_de(lote)
    lote.cantidad_kg = Decimal("30.0")  # el lote en BD ya no coincide con lo firmado
    db = _DBStub(lote=lote)
    entrega = _entrega(sello_original, sello_original, integridad_reportada=True)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is False
    assert lote.estado_actual == "Alerta de Manipulación"


@pytest.mark.asyncio
async def test_lote_inexistente_no_puede_verificarse_marca_alerta():
    """Sin lote en BD no hay sello contra qué comparar -> no se puede afirmar
    integridad. Se registra la bitácora igual (RF-3.4) pero como alerta."""
    db = _DBStub(lote=None)
    entrega = _entrega(_HASH_FALSO, _HASH_FALSO, integridad_reportada=True)

    resultado = await consolidar_entrega(db, "device-uuid", entrega)

    assert resultado is False
    assert len(db.added) == 1
    assert db.added[0].integridad_validada is False
