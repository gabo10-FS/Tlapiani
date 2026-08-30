"""Integración HTTP real para /api/v1/centros-acopio. Ver tests/conftest.py."""

import pytest

pytestmark = pytest.mark.asyncio


async def test_listar_sin_token_devuelve_200_vacio(client):
    # Público a propósito -- no requiere sesión.
    resp = await client.get("/api/v1/centros-acopio")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_crear_sin_rol_admin_devuelve_403(client, seed_usuarios, login_as):
    token = await login_as(client, seed_usuarios["Donante"])
    resp = await client.post(
        "/api/v1/centros-acopio",
        json={"nombre": "Centro Norte", "estado": "Oaxaca", "latitud": 17.05, "longitud": -96.0, "capacidad": "500 kg/día"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


async def test_crear_como_administrador_y_listar_publico(client, seed_usuarios, login_as):
    token = await login_as(client, seed_usuarios["Administrador"])
    creado = await client.post(
        "/api/v1/centros-acopio",
        json={"nombre": "Centro Norte", "estado": "Oaxaca", "latitud": 17.05, "longitud": -96.0, "capacidad": "500 kg/día"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert creado.status_code == 201
    body = creado.json()
    assert body["nombre"] == "Centro Norte"
    assert "id" in body

    listado = await client.get("/api/v1/centros-acopio")
    assert listado.status_code == 200
    assert len(listado.json()) == 1
