"""Infraestructura compartida para tests de integración HTTP.

Por defecto usa SQLite en memoria (rápido, sin dependencias). Para correr la
MISMA suite contra una MariaDB/MySQL real -- lo que detecta incompatibilidades
de dialecto que SQLite tolera (ver tests/test_sql_dialect_compat.py y el bug de
RETURNING que motivó esa cobertura) -- define la variable de entorno
`TEST_MYSQL_URL`, p. ej.:

    TEST_MYSQL_URL=mysql+aiomysql://root@127.0.0.1:3306/tlapiani_test pytest

El esquema se crea con `Base.metadata.create_all` y se borra al terminar cada
test. Nota: `create_all` NO crea los triggers de inmutabilidad de RNF-1.1
(trg_prevent_update_bitacora / _delete) -- viven en la migración de Alembic, no
en los modelos. Los cubre `tests/test_immutability_triggers.py`, que también
necesita `TEST_MYSQL_URL` y aplica esos `CREATE TRIGGER` leyéndolos de la
migración.
"""

import os
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.comunidad import Comunidad
from app.models.usuario import Usuario

TEST_MYSQL_URL = os.getenv("TEST_MYSQL_URL")


@pytest_asyncio.fixture
async def test_engine():
    if TEST_MYSQL_URL:
        engine = create_async_engine(TEST_MYSQL_URL)
    else:
        engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    if TEST_MYSQL_URL:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(test_engine):
    session_factory = async_sessionmaker(bind=test_engine, expire_on_commit=False)

    async def _override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_usuarios(test_engine):
    """Un usuario real (password hasheado con la misma función de producción)
    por cada rol, para poder loguearse de verdad vía POST /auth/login en los
    tests en vez de fabricar JWTs a mano."""
    datos = {
        "Administrador": {
            "email": "admin@test.tlapiani.mx",
            "password": "admin12345",
            "nombre_completo": "Admin Test",
        },
        "Donante": {
            "email": "donante@test.tlapiani.mx",
            "password": "donante12345",
            "nombre_completo": "Donante Test",
        },
        "Transportista": {
            "email": "transportista@test.tlapiani.mx",
            "password": "transp12345",
            "nombre_completo": "Transportista Test",
        },
    }
    session_factory = async_sessionmaker(bind=test_engine, expire_on_commit=False)
    async with session_factory() as session:
        for rol, info in datos.items():
            session.add(
                Usuario(
                    nombre_completo=info["nombre_completo"],
                    email=info["email"],
                    password_hash=hash_password(info["password"]),
                    rol=rol,
                )
            )
        await session.commit()
    return datos


@pytest_asyncio.fixture
async def seed_comunidad(test_engine) -> int:
    session_factory = async_sessionmaker(bind=test_engine, expire_on_commit=False)
    async with session_factory() as session:
        comunidad = Comunidad(
            nombre="San Juan Cancuc",
            estado="Chiapas",
            latitud=Decimal("16.924700"),
            longitud=Decimal("-92.428300"),
            indice_marginacion=Decimal("90"),
            indice_pobreza=Decimal("85"),
            coeficiente_emergencia=Decimal("0"),
        )
        session.add(comunidad)
        await session.commit()
        await session.refresh(comunidad)
        return comunidad.id


@pytest.fixture
def login_as():
    """Helper: hace el POST /auth/login real contra el `client` de prueba y
    devuelve el access_token, para no repetir el mismo bloque en cada test."""

    async def _login(http_client: AsyncClient, usuario: dict) -> str:
        resp = await http_client.post(
            "/api/v1/auth/login",
            json={"email": usuario["email"], "password": usuario["password"]},
        )
        assert resp.status_code == 200, f"login de prueba falló: {resp.status_code} {resp.text}"
        return resp.json()["access_token"]

    return _login
