"""Integración HTTP real para /api/v1/donaciones/*. Ver tests/conftest.py."""

import pytest

pytestmark = pytest.mark.asyncio


def _payload_lote(comunidad_id: int) -> dict:
    return {
        "tipo_bien": "Canasta Básica Alimentos",
        "cantidad_kg": 25.0,
        "comunidad_destino_id": comunidad_id,
        "origen_acopio": "Centro de Acopio Puebla Centro",
    }


async def test_registrar_lote_sin_token_devuelve_401(client, seed_comunidad):
    resp = await client.post("/api/v1/donaciones/registrar", json=_payload_lote(seed_comunidad))
    assert resp.status_code == 401


async def test_registrar_lote_con_rol_no_autorizado_devuelve_403(
    client, seed_usuarios, seed_comunidad, login_as
):
    # registrar_lote exige rol Administrador -- Transportista debe ser rechazado
    token = await login_as(client, seed_usuarios["Transportista"])
    resp = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


async def test_registrar_lote_como_administrador_devuelve_201(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    resp = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["lote_id"].startswith("TLAP-")
    assert len(body["hash_sha256"]) == 64
    assert body["status"] == "Creado"


async def test_registrar_lote_con_token_invalido_devuelve_401(client, seed_comunidad):
    resp = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": "Bearer esto-no-es-un-token-valido"},
    )
    assert resp.status_code == 401


async def test_despachar_lote_con_rol_no_autorizado_devuelve_403(
    client, seed_usuarios, seed_comunidad, login_as
):
    # despachar_lote acepta Administrador o Transportista -- Donante no
    token_admin = await login_as(client, seed_usuarios["Administrador"])
    registro = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    lote_id = registro.json()["lote_id"]

    token_donante = await login_as(client, seed_usuarios["Donante"])
    resp = await client.post(
        f"/api/v1/donaciones/{lote_id}/despachar",
        json={"transportista_id": 1},
        headers={"Authorization": f"Bearer {token_donante}"},
    )
    assert resp.status_code == 403


async def test_historial_lote_es_publico_sin_token(client, seed_usuarios, seed_comunidad, login_as):
    token_admin = await login_as(client, seed_usuarios["Administrador"])
    registro = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    lote_id = registro.json()["lote_id"]

    # Sin header Authorization -- RF-2.4, portal público de transparencia
    resp = await client.get(f"/api/v1/donaciones/historial/{lote_id}")
    assert resp.status_code == 200
    assert resp.json()["lote_id"] == lote_id
