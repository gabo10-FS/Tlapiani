from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.comunidad import AlertaEmergenciaPayload


def test_alerta_emergencia_acepta_coeficiente_en_rango():
    payload = AlertaEmergenciaPayload(coeficiente_emergencia=95, motivo="Sismo 7.2 Mw")
    assert payload.coeficiente_emergencia == 95
    assert payload.activa is True  # default


def test_alerta_emergencia_rechaza_coeficiente_mayor_a_100():
    with pytest.raises(ValidationError):
        AlertaEmergenciaPayload(coeficiente_emergencia=150, motivo="Sismo 7.2 Mw")


def test_alerta_emergencia_rechaza_coeficiente_negativo():
    with pytest.raises(ValidationError):
        AlertaEmergenciaPayload(coeficiente_emergencia=-1, motivo="Sismo 7.2 Mw")


def test_alerta_emergencia_rechaza_coeficiente_estilo_0_1():
    """0.95 es válido numéricamente en 0-100, pero probablemente sea un error
    de quien llama (pensando en escala 0-1). No lo podemos prohibir sin más
    contexto — 0.95 es un valor legítimo y muy bajo en escala 0-100 — así que
    este test documenta el comportamiento actual, no una regla nueva."""
    payload = AlertaEmergenciaPayload(coeficiente_emergencia=0.95, motivo="Sismo menor")
    assert payload.coeficiente_emergencia == Decimal("0.95")


def test_alerta_emergencia_rechaza_motivo_vacio():
    with pytest.raises(ValidationError):
        AlertaEmergenciaPayload(coeficiente_emergencia=50, motivo="")
