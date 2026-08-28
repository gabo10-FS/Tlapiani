"""Integración HTTP real (httpx.AsyncClient + SQLite en memoria) para
POST /api/v1/auth/login. Ver tests/conftest.py para los fixtures y sus
limitaciones (no es MariaDB real)."""

import pytest

pytestmark = pytest.mark.asyncio


async def test_login_credenciales_correctas_devuelve_200_y_token(client, seed_usuarios):
    admin = seed_usuarios["Administrador"]
    resp = await client.post(
        "/api/v1/auth/login", json={"email": admin["email"], "password": admin["password"]}
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["rol"] == "Administrador"
    assert isinstance(body["access_token"], str) and len(body["access_token"]) > 0


async def test_login_password_incorrecta_devuelve_401(client, seed_usuarios):
    admin = seed_usuarios["Administrador"]
    resp = await client.post(
        "/api/v1/auth/login", json={"email": admin["email"], "password": "password-equivocada"}
    )

    assert resp.status_code == 401


async def test_login_email_inexistente_devuelve_401(client, seed_usuarios):
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "no-existe@tlapiani.mx", "password": "cualquiera"}
    )

    assert resp.status_code == 401
