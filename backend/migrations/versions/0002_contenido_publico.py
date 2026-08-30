"""Contenido público real: centros_acopio, fotos_comunidad, noticias, historias.

Estas cuatro tablas respaldan módulos del dashboard que hasta ahora vivían
solo como mocks en el frontend (dashboard/js/mock/data.js) por falta de
endpoint: catálogo de centros de acopio (usado en Inventario y en "centros
cercanos" del mapa), galería de fotos por comunidad, noticias y historias
del sitio público.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-30

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "centros_acopio",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("estado", sa.String(100), nullable=False),
        sa.Column("latitud", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitud", sa.Numeric(9, 6), nullable=False),
        sa.Column("capacidad", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "fotos_comunidad",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("comunidad_id", sa.Integer, sa.ForeignKey("comunidades.id"), nullable=False),
        sa.Column("url", sa.String(255), nullable=False),
        sa.Column("caption", sa.String(255), nullable=False),
        sa.Column("subido_por_id", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "noticias",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("resumen", sa.String(500), nullable=False),
        sa.Column("zona", sa.String(150), nullable=False),
        sa.Column("fecha", sa.Date, nullable=False),
        sa.Column("nivel", sa.String(30), nullable=False),
        sa.Column("tipo", sa.String(50), nullable=False),
        sa.Column("prioridad", sa.Integer, nullable=False, server_default="50"),
        sa.Column("img_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "historias",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("comunidad", sa.String(150), nullable=False),
        sa.Column("resumen", sa.String(500), nullable=False),
        sa.Column("cita", sa.String(500), nullable=False),
        sa.Column("autor", sa.String(150), nullable=False),
        sa.Column("impacto", sa.String(100), nullable=False),
        sa.Column("img_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        mysql_engine="InnoDB",
    )


def downgrade() -> None:
    op.drop_table("historias")
    op.drop_table("noticias")
    op.drop_table("fotos_comunidad")
    op.drop_table("centros_acopio")
