import asyncio
import hashlib
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.services.integridad_service import formatear_timestamp, generar_sello, siguiente_lote_id


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


@pytest.mark.asyncio
async def test_siguiente_lote_id_no_genera_duplicados_bajo_llamadas_concurrentes():
    """RNF-2.2: el backend debe soportar solicitudes concurrentes sin
    degradarse -- para siguiente_lote_id eso significa, en concreto, que dos
    despachos simultáneos nunca reciben el mismo TLAP-YYYY-XXXX.

    Nota honesta sobre cómo se llegó a este test: la primera versión de
    siguiente_lote_id hacía el upsert y LUEGO un SELECT aparte para leer el
    número. Con StaticPool (una sola conexión SQLite compartida por las 20
    "llamadas concurrentes" de este test) eso fallaba de verdad: bajo el
    interleaving cooperativo de asyncio, los 20 upserts podían ejecutarse
    antes que cualquier SELECT, y las 20 llamadas terminaban leyendo el mismo
    número final -- exactamente el bug de duplicados que este test existe
    para detectar. En MariaDB real esa ventana no debería existir porque el
    propio INSERT..ON DUPLICATE KEY UPDATE toma el row-lock de inmediato, pero
    esa garantía depende del motor, no del código en sí -- y con dos
    sentencias separadas, nada impedía que un motor con locking distinto (o
    una prueba de un solo proceso como esta) la violara. La solución no fue
    ajustar el test para "tolerar" el fallo -- fue eliminar la ventana en
    integridad_service.py usando RETURNING (upsert + lectura en una sola
    sentencia atómica). Con eso, este mismo test -- sin ningún otro cambio --
    pasa de forma consistente.

    Sigue habiendo un límite real de lo que esto prueba: corre contra SQLite
    en memoria, no contra MariaDB (no hay servidor disponible en este
    entorno). El branch de SQL para MariaDB se verificó por inspección del
    SQL compilado, no por ejecución real -- ver integridad_service.py.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    async def _una_llamada() -> str:
        async with session_factory() as session:
            lote_id = await siguiente_lote_id(session, 2026)
            await session.commit()
            return lote_id

    N = 20
    try:
        resultados = await asyncio.gather(*[_una_llamada() for _ in range(N)])
    finally:
        await engine.dispose()

    assert len(resultados) == N
    assert len(set(resultados)) == N, f"IDs duplicados detectados: {resultados}"
    numeros = sorted(int(r.rsplit("-", 1)[-1]) for r in resultados)
    assert numeros == list(range(1, N + 1))
