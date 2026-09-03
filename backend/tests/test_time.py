"""app/core/time.py — convención de tiempo del backend (UTC, segundos, sufijo Z)."""

import re
from datetime import datetime, timedelta, timezone

from app.core.time import a_utc_naive, ahora_utc, formatear_utc_z

_FORMATO_Z = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def test_ahora_utc_es_naive_sin_microsegundos():
    ahora = ahora_utc()
    assert ahora.tzinfo is None
    assert ahora.microsecond == 0


def test_ahora_utc_esta_en_utc_no_en_hora_local():
    # tolerancia amplia: solo distingue UTC de una hora local con offset real
    delta = abs(ahora_utc() - datetime.now(timezone.utc).replace(tzinfo=None))
    assert delta < timedelta(seconds=5)


def test_formatear_utc_z():
    momento = datetime(2026, 6, 29, 9, 15, 0)
    assert formatear_utc_z(momento) == "2026-06-29T09:15:00Z"
    assert _FORMATO_Z.match(formatear_utc_z(ahora_utc()))


def test_a_utc_naive_convierte_aware_a_utc():
    aware = datetime(2026, 6, 29, 8, 30, 0, 123456, tzinfo=timezone(timedelta(hours=2)))
    assert a_utc_naive(aware) == datetime(2026, 6, 29, 6, 30, 0)


def test_a_utc_naive_asume_utc_si_no_hay_tzinfo():
    naive = datetime(2026, 6, 29, 6, 30, 0, 999000)
    assert a_utc_naive(naive) == datetime(2026, 6, 29, 6, 30, 0)
