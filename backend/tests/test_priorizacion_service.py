from decimal import Decimal

from app.services.priorizacion_service import calcular_score_urgencia, clasificar


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
