"""Guardas de compatibilidad de SQL por dialecto — corren SIEMPRE, sin BD.

Existen por un bug real: `siguiente_lote_id` generaba `INSERT .. ON DUPLICATE KEY
UPDATE .. RETURNING`, que MariaDB rechaza en cualquier versión, pero la suite de
integración corre sobre SQLite (que sí lo soporta) y nunca lo detectó. Estos
tests compilan el SQL que la rama de cada motor produce y lo inspeccionan, para
que esa clase de regresión falle en local aunque no haya una MariaDB a mano.
"""

import types

import pytest
from sqlalchemy.dialects import mysql, sqlite

from app.services.integridad_service import siguiente_lote_id

pytestmark = pytest.mark.asyncio


class _ResultadoFalso:
    def scalar_one(self) -> int:
        return 7


class _SesionQueCaptura:
    """Reemplaza a AsyncSession: no toca ninguna BD, solo compila y guarda el
    SQL que `siguiente_lote_id` intenta ejecutar para poder inspeccionarlo."""

    _DIALECTOS = {"mysql": mysql.dialect(), "sqlite": sqlite.dialect()}

    def __init__(self, nombre_dialecto: str):
        self.bind = types.SimpleNamespace(
            dialect=types.SimpleNamespace(name=nombre_dialecto)
        )
        self._dialecto = self._DIALECTOS[nombre_dialecto]
        self.sql_ejecutado: list[str] = []

    async def execute(self, stmt):
        self.sql_ejecutado.append(str(stmt.compile(dialect=self._dialecto)))
        return _ResultadoFalso()


async def test_siguiente_lote_id_no_usa_returning_en_mysql():
    sesion = _SesionQueCaptura("mysql")
    await siguiente_lote_id(sesion, 2026)

    sql = " ".join(sesion.sql_ejecutado).upper()
    assert "RETURNING" not in sql, (
        "MariaDB no soporta RETURNING junto a ON DUPLICATE KEY UPDATE en ninguna "
        f"versión. SQL generado: {sesion.sql_ejecutado}"
    )
    assert "LAST_INSERT_ID" in sql, (
        f"se esperaba el idioma LAST_INSERT_ID. SQL generado: {sesion.sql_ejecutado}"
    )


async def test_siguiente_lote_id_hace_dos_sentencias_en_mysql():
    # upsert + SELECT LAST_INSERT_ID(), ambas en la misma transacción del router
    sesion = _SesionQueCaptura("mysql")
    await siguiente_lote_id(sesion, 2026)
    assert len(sesion.sql_ejecutado) == 2


async def test_siguiente_lote_id_usa_returning_en_sqlite():
    # la rama SQLite (solo tests) sí necesita RETURNING: ver el docstring de
    # siguiente_lote_id y el test de concurrencia con StaticPool.
    sesion = _SesionQueCaptura("sqlite")
    await siguiente_lote_id(sesion, 2026)

    sql = " ".join(sesion.sql_ejecutado).upper()
    assert "RETURNING" in sql
    assert len(sesion.sql_ejecutado) == 1
