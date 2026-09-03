"""RF-1.1 — Motor de Priorización (IA).

SU = (alpha * IM) + (beta * IE) + (gamma * CE), con alpha + beta + gamma = 1.
Pesos configurables vía PRIORIDAD_ALPHA/BETA/GAMMA (backend/.env).
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.comunidad import Comunidad

UMBRAL_CRITICA = Decimal("80")
UMBRAL_ALTA = Decimal("50")


def calcular_score_urgencia(
    indice_marginacion: Decimal,
    indice_pobreza: Decimal,
    coeficiente_emergencia: Decimal,
    alpha: Decimal,
    beta: Decimal,
    gamma: Decimal,
) -> Decimal:
    score = (alpha * indice_marginacion) + (beta * indice_pobreza) + (gamma * coeficiente_emergencia)
    return min(Decimal("100"), max(Decimal("0"), score)).quantize(Decimal("0.01"))


def clasificar(score_urgencia: Decimal) -> str:
    if score_urgencia >= UMBRAL_CRITICA:
        return "Prioridad Crítica"
    if score_urgencia >= UMBRAL_ALTA:
        return "Prioridad Alta"
    return "Prioridad Baja"


def _pesos() -> tuple[Decimal, Decimal, Decimal]:
    settings = get_settings()
    return (
        Decimal(str(settings.PRIORIDAD_ALPHA)),
        Decimal(str(settings.PRIORIDAD_BETA)),
        Decimal(str(settings.PRIORIDAD_GAMMA)),
    )


def _aplicar_score(comunidad: Comunidad) -> None:
    alpha, beta, gamma = _pesos()
    comunidad.score_urgencia = calcular_score_urgencia(
        comunidad.indice_marginacion,
        comunidad.indice_pobreza,
        comunidad.coeficiente_emergencia,
        alpha,
        beta,
        gamma,
    )
    comunidad.clasificacion = clasificar(comunidad.score_urgencia)


async def recalcular_comunidad(db: AsyncSession, comunidad: Comunidad) -> Comunidad:
    _aplicar_score(comunidad)
    await db.commit()
    await db.refresh(comunidad)
    return comunidad


async def recalcular_todas(db: AsyncSession) -> int:
    resultado = await db.execute(select(Comunidad))
    comunidades = resultado.scalars().all()
    for comunidad in comunidades:
        _aplicar_score(comunidad)
    await db.commit()
    return len(comunidades)
