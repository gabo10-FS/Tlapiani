"""RNF-1.1 — la bitácora de entregas es inmutable: ningún UPDATE/DELETE la toca.

Los triggers `trg_prevent_update_bitacora` / `trg_prevent_delete_bitacora` son SQL
crudo de MariaDB en `migrations/versions/0001_initial_schema.py` — no se pueden
expresar a nivel de modelo, así que `Base.metadata.create_all()` (lo que usa el
resto de la suite) NO los crea. Este test solo corre contra una MariaDB real
(`TEST_MYSQL_URL`, ver tests/conftest.py) y aplica los mismos `CREATE TRIGGER`
leídos de la migración, para no duplicar el DDL ni arriesgar que se desincronice.
"""

import os
import re
from datetime import datetime
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models.comunidad import Comunidad  # noqa: F401 — registra tablas en metadata
from app.models.envio_bitacora import EnvioBitacora  # noqa: F401
from app.models.lote import Lote  # noqa: F401

TEST_MYSQL_URL = os.getenv("TEST_MYSQL_URL")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not TEST_MYSQL_URL,
        reason="requiere una MariaDB real (define TEST_MYSQL_URL); los triggers no existen en SQLite",
    ),
]

_MIGRACION_0001 = Path(__file__).resolve().parents[1] / "migrations" / "versions" / "0001_initial_schema.py"


def _sentencias_create_trigger() -> list[str]:
    fuente = _MIGRACION_0001.read_text(encoding="utf-8")
    bloques = re.findall(r'op\.execute\(\s*"""(.*?)"""\s*\)', fuente, re.DOTALL)
    triggers = [b.strip() for b in bloques if "CREATE TRIGGER" in b and "envios_bitacora" in b]
    assert len(triggers) == 2, f"se esperaban 2 CREATE TRIGGER en {_MIGRACION_0001.name}, hay {len(triggers)}"
    return triggers


@pytest_asyncio.fixture
async def db_con_triggers():
    engine = create_async_engine(TEST_MYSQL_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        for ddl in _sentencias_create_trigger():
            await conn.execute(text(ddl))
    try:
        async with async_sessionmaker(bind=engine, expire_on_commit=False)() as session:
            yield session
    finally:
        async with engine.begin() as conn:
            await conn.execute(text("DROP TRIGGER IF EXISTS trg_prevent_update_bitacora"))
            await conn.execute(text("DROP TRIGGER IF EXISTS trg_prevent_delete_bitacora"))
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()


async def _sembrar_bitacora(session) -> int:
    session.add(
        Comunidad(nombre="C", estado="E", latitud=0, longitud=0)
    )
    await session.flush()
    comunidad_id = (await session.execute(text("SELECT id FROM comunidades LIMIT 1"))).scalar_one()
    session.add(
        Lote(
            id="TLAP-2026-9001",
            tipo_bien="Kit",
            cantidad_kg=1,
            origen_acopio="Bodega",
            comunidad_destino_id=comunidad_id,
            estado_actual="Creado",
            hash_sha256="a" * 64,
        )
    )
    await session.flush()
    registro = EnvioBitacora(
        lote_id="TLAP-2026-9001",
        hash_origen="a" * 64,
        hash_calculado_recepcion="a" * 64,
        integridad_validada=True,
        timestamp_entrega=datetime(2026, 6, 29, 6, 30, 0),
        receptor_firma_id="CURP_X",
        dispositivo_uuid="dev",
    )
    session.add(registro)
    await session.commit()
    return registro.id


async def test_update_en_bitacora_es_rechazado(db_con_triggers):
    bitacora_id = await _sembrar_bitacora(db_con_triggers)
    with pytest.raises(DBAPIError) as exc:
        await db_con_triggers.execute(
            text("UPDATE envios_bitacora SET integridad_validada = 0 WHERE id = :i"),
            {"i": bitacora_id},
        )
        await db_con_triggers.commit()
    assert "1644" in str(exc.value) or "45000" in str(exc.value)


async def test_delete_en_bitacora_es_rechazado(db_con_triggers):
    bitacora_id = await _sembrar_bitacora(db_con_triggers)
    with pytest.raises(DBAPIError) as exc:
        await db_con_triggers.execute(
            text("DELETE FROM envios_bitacora WHERE id = :i"), {"i": bitacora_id}
        )
        await db_con_triggers.commit()
    assert "1644" in str(exc.value) or "45000" in str(exc.value)


async def test_insert_en_bitacora_sigue_permitido(db_con_triggers):
    # la inmutabilidad es solo contra UPDATE/DELETE — sync_service necesita insertar
    bitacora_id = await _sembrar_bitacora(db_con_triggers)
    assert bitacora_id > 0
    total = (await db_con_triggers.execute(text("SELECT COUNT(*) FROM envios_bitacora"))).scalar_one()
    assert total == 1
