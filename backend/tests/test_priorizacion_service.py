from decimal import Decimal

import pytest

from app.services.priorizacion_service import calcular_score_urgencia, clasificar, recalcular_comunidad


def test_score_urgencia_pondera_correctamente():
    score = calcular_score_urgencia(
        indice_marginacion=Decimal("90"),
        indice_pobreza=Decimal("85"),
        coeficiente_emergencia=Decimal("60"),
        alpha=Decimal("0.4"),
        beta=Decimal("0.4"),
        gamma=Decimal("0.2"),
    )
    # (0.4*90) + (0.4*85) + (0.2*60) = 36 + 34 + 12 = 82.00
    assert score == Decimal("82.00")


def test_score_urgencia_se_acota_entre_0_y_100():
    score_alto = calcular_score_urgencia(
        Decimal("100"), Decimal("100"), Decimal("100"), Decimal("0.4"), Decimal("0.4"), Decimal("0.2")
    )
    assert score_alto <= Decimal("100")

    score_bajo = calcular_score_urgencia(
        Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0.4"), Decimal("0.4"), Decimal("0.2")
    )
    assert score_bajo >= Decimal("0")


def test_clasificacion_por_umbral():
    assert clasificar(Decimal("98.40")) == "Prioridad Crítica"
    assert clasificar(Decimal("80.00")) == "Prioridad Crítica"
    assert clasificar(Decimal("79.99")) == "Prioridad Alta"
    assert clasificar(Decimal("50.00")) == "Prioridad Alta"
    assert clasificar(Decimal("49.99")) == "Prioridad Baja"
    assert clasificar(Decimal("0.00")) == "Prioridad Baja"


class _ComunidadStub:
    """Sustituto mínimo de app.models.comunidad.Comunidad para no requerir BD."""

    def __init__(self, indice_marginacion, indice_pobreza, coeficiente_emergencia):
        self.indice_marginacion = Decimal(indice_marginacion)
        self.indice_pobreza = Decimal(indice_pobreza)
        self.coeficiente_emergencia = Decimal(coeficiente_emergencia)
        self.score_urgencia = Decimal("0")
        self.clasificacion = ""


class _DBStub:
    async def commit(self):
        pass

    async def refresh(self, _obj):
        pass


@pytest.mark.asyncio
async def test_recalcular_comunidad_solo_afecta_la_comunidad_recibida():
    """RF-1.1 puntual: una alerta CENAPRED recalcula UNA comunidad, no todas.

    recalcular_comunidad nunca consulta la tabla comunidades — solo opera
    sobre el objeto que recibe — así que "recálculo puntual, no masivo" no es
    solo una intención de diseño: está garantizado por la firma de la función,
    que no tiene forma de tocar otras filas aunque quisiera.
    """
    comunidad = _ComunidadStub(indice_marginacion="90", indice_pobreza="85", coeficiente_emergencia="95")

    resultado = await recalcular_comunidad(_DBStub(), comunidad)

    # (0.4*90) + (0.4*85) + (0.2*95) = 36 + 34 + 19 = 89.00
    assert resultado.score_urgencia == Decimal("89.00")
    assert resultado.clasificacion == "Prioridad Crítica"
    assert resultado is comunidad  # no crea un objeto nuevo, muta el recibido


@pytest.mark.asyncio
async def test_recalcular_comunidad_con_alerta_severa_sube_la_clasificacion():
    """Confirma que la escala 0-100 de coeficiente_emergencia sí puede mover
    la clasificación — la motivación original de la pregunta de escala."""
    # Sin alerta: 0.4*45 + 0.4*40 + 0.2*0 = 34.00 -> Prioridad Baja
    sin_alerta = _ComunidadStub(indice_marginacion="45", indice_pobreza="40", coeficiente_emergencia="0")
    resultado_sin_alerta = await recalcular_comunidad(_DBStub(), sin_alerta)
    assert resultado_sin_alerta.clasificacion == "Prioridad Baja"

    # Con alerta severa: 0.4*45 + 0.4*40 + 0.2*100 = 18+16+20 = 54.00 -> Prioridad Alta
    con_alerta = _ComunidadStub(indice_marginacion="45", indice_pobreza="40", coeficiente_emergencia="100")
    resultado_con_alerta = await recalcular_comunidad(_DBStub(), con_alerta)
    assert resultado_con_alerta.clasificacion == "Prioridad Alta"
    assert resultado_con_alerta.score_urgencia > resultado_sin_alerta.score_urgencia
