"""Quita el DEFAULT current_timestamp() de las columnas de fecha.

`NOW()` / `current_timestamp()` en MariaDB devuelve la hora **local** del
servidor, no UTC — con eso `created_at`/`updated_at` quedaban corridos respecto
al resto de timestamps del backend (el sello SHA-256, los timestamps de
despacho), que sí son UTC.

Ahora esas columnas las llena SQLAlchemy con `app.core.time.ahora_utc()` (UTC
naïve, truncado a segundos). La columna deja de tener DEFAULT en BD: el único
camino de escritura es el ORM, que siempre provee el valor.

Nota: se usa `MODIFY COLUMN ... DEFAULT NULL` explícito porque en MariaDB 10.4
ni `server_default=None` de Alembic ni `ALTER COLUMN ... DROP DEFAULT` quitan el
default de una columna DATETIME.

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-02

"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

# (tabla, columna): todas DATETIME NULL con DEFAULT current_timestamp() en 0001/0002
_COLUMNAS_FECHA = [
    ("comunidades", "updated_at"),
    ("usuarios", "created_at"),
    ("lotes", "created_at"),
    ("envios_bitacora", "created_at"),
    ("centros_acopio", "created_at"),
    ("fotos_comunidad", "created_at"),
    ("noticias", "created_at"),
    ("historias", "created_at"),
]


def upgrade() -> None:
    for tabla, columna in _COLUMNAS_FECHA:
        op.execute(f"ALTER TABLE `{tabla}` MODIFY COLUMN `{columna}` DATETIME NULL DEFAULT NULL")


def downgrade() -> None:
    for tabla, columna in _COLUMNAS_FECHA:
        op.execute(
            f"ALTER TABLE `{tabla}` MODIFY COLUMN `{columna}` DATETIME NULL "
            "DEFAULT current_timestamp()"
        )
