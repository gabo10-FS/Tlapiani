import hashlib
from datetime import datetime, timezone
from decimal import Decimal

from app.services.integridad_service import formatear_timestamp, generar_sello


def test_formatear_timestamp_produce_iso_utc_con_z():
    momento = datetime(2026, 6, 29, 9, 15, 0, tzinfo=timezone.utc)
    assert formatear_timestamp(momento) == "2026-06-29T09:15:00Z"


def test_generar_sello_es_determinista():
    momento = datetime(2026, 6, 29, 9, 15, 0, tzinfo=timezone.utc)
    sello_a = generar_sello("TLAP-2026-9981", "Canasta Básica Alimentos", Decimal("25.0"), 21005, momento)
    sello_b = generar_sello("TLAP-2026-9981", "Canasta Básica Alimentos", Decimal("25.0"), 21005, momento)
    assert sello_a == sello_b
    assert len(sello_a) == 64  # hex de SHA-256


def test_generar_sello_coincide_con_formula_documentada():
    momento = datetime(2026, 6, 29, 9, 15, 0, tzinfo=timezone.utc)
    payload_esperado = "TLAP-2026-9981|Canasta Básica Alimentos|25.00|21005|2026-06-29T09:15:00Z"
    esperado = hashlib.sha256(payload_esperado.encode("utf-8")).hexdigest()

    obtenido = generar_sello("TLAP-2026-9981", "Canasta Básica Alimentos", Decimal("25.0"), 21005, momento)
    assert obtenido == esperado


def test_generar_sello_cambia_si_cambia_cualquier_campo():
    momento = datetime(2026, 6, 29, 9, 15, 0, tzinfo=timezone.utc)
    base = generar_sello("TLAP-2026-9981", "Alimentos", Decimal("25.0"), 21005, momento)
    distinto_destino = generar_sello("TLAP-2026-9981", "Alimentos", Decimal("25.0"), 21006, momento)
    assert base != distinto_destino
