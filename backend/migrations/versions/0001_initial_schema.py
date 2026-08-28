"""Esquema inicial: comunidades, usuarios, lotes, lote_secuencias, envios_bitacora
+ triggers de inmutabilidad (RNF-1.1).

Revision ID: 0001
Revises:
Create Date: 2026-08-22

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "comunidades",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("estado", sa.String(100), nullable=False),
        sa.Column("latitud", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitud", sa.Numeric(9, 6), nullable=False),
        sa.Column("indice_marginacion", sa.Numeric(5, 2), server_default="0.00"),
        sa.Column("indice_pobreza", sa.Numeric(5, 2), server_default="0.00"),
        sa.Column("coeficiente_emergencia", sa.Numeric(5, 2), server_default="0.00"),
        sa.Column("score_urgencia", sa.Numeric(5, 2), server_default="0.00"),
        sa.Column("clasificacion", sa.String(50), server_default="Prioridad Baja"),
        sa.Column("alerta_activa", sa.Boolean, server_default=sa.false()),
        sa.Column("alerta_motivo", sa.String(255), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime,
            server_default=sa.func.now(),
            server_onupdate=sa.func.now(),
        ),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nombre_completo", sa.String(150), nullable=False),
        sa.Column("email", sa.String(150), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("rol", sa.String(30), nullable=False),  # Administrador | Donante | Transportista
        sa.Column("activo", sa.Boolean, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "lote_secuencias",
        sa.Column("anio", sa.Integer, primary_key=True, autoincrement=False),
        sa.Column("ultimo_numero", sa.Integer, nullable=False, server_default="0"),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "lotes",
        sa.Column("id", sa.String(50), primary_key=True),  # TLAP-YYYY-XXXX
        sa.Column("tipo_bien", sa.String(150), nullable=False),
        sa.Column("cantidad_kg", sa.Numeric(10, 2), nullable=False),
        sa.Column("origen_acopio", sa.String(150), nullable=False),
        sa.Column("comunidad_destino_id", sa.Integer, sa.ForeignKey("comunidades.id"), nullable=False),
        sa.Column("estado_actual", sa.String(50), server_default="Creado"),
        sa.Column("hash_sha256", sa.String(64), nullable=False),
        sa.Column("transportista_id", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("despachado_en", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "envios_bitacora",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("lote_id", sa.String(50), sa.ForeignKey("lotes.id"), nullable=False),
        sa.Column("hash_origen", sa.String(64), nullable=False),
        sa.Column("hash_calculado_recepcion", sa.String(64), nullable=False),
        sa.Column("integridad_validada", sa.Boolean, nullable=False),
        sa.Column("timestamp_entrega", sa.DateTime, nullable=False),
        sa.Column("receptor_firma_id", sa.String(50), nullable=False),
        sa.Column("dispositivo_uuid", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        mysql_engine="InnoDB",
    )

    # RNF-1.1 — Inmutabilidad: ningún UPDATE/DELETE puede tocar la bitácora de entregas.
    op.execute(
        """
        CREATE TRIGGER trg_prevent_update_bitacora
        BEFORE UPDATE ON envios_bitacora
        FOR EACH ROW
        BEGIN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se permite la modificación de registros históricos de entrega.';
        END
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_prevent_delete_bitacora
        BEFORE DELETE ON envios_bitacora
        FOR EACH ROW
        BEGIN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se permite la eliminación de registros históricos de entrega.';
        END
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_prevent_delete_bitacora")
    op.execute("DROP TRIGGER IF EXISTS trg_prevent_update_bitacora")
    op.drop_table("envios_bitacora")
    op.drop_table("lotes")
    op.drop_table("lote_secuencias")
    op.drop_table("usuarios")
    op.drop_table("comunidades")
