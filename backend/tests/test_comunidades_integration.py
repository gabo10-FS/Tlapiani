"""Integración HTTP real para /api/v1/comunidades/*. Ver tests/conftest.py."""

import pytest

pytestmark = pytest.mark.asyncio


async def test_listar_prioridad_sin_token_devuelve_401(client):
    resp = await client.get("/api/v1/comunidades/prioridad")
    assert resp.status_code == 401


async def test_listar_prioridad_con_cualquier_rol_autenticado_devuelve_200(
    client, seed_usuarios, seed_comunidad, login_as
):
    # listar_prioridad solo exige estar autenticado, no un rol específico
    token = await login_as(client, seed_usuarios["Donante"])
    resp = await client.get(
        "/api/v1/comunidades/prioridad", headers={"Authorization": f"Bearer {token}"}
    )

    assert resp.status_code == 200
    comunidades = resp.json()
    assert len(comunidades) == 1
    assert comunidades[0]["comunidad_id"] == seed_comunidad
    assert "alerta_activa" in comunidades[0]


async def test_alerta_emergencia_sin_rol_admin_devuelve_403(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Donante"])
    resp = await client.post(
        f"/api/v1/comunidades/{seed_comunidad}/alerta-emergencia",
        json={"coeficiente_emergencia": 90, "motivo": "Sismo 7.2 Mw", "activa": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


async def test_alerta_emergencia_como_administrador_devuelve_200_y_recalcula(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    resp = await client.post(
        f"/api/v1/comunidades/{seed_comunidad}/alerta-emergencia",
        json={"coeficiente_emergencia": 90, "motivo": "Sismo 7.2 Mw", "activa": True},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["alerta_activa"] is True
    assert body["alerta_motivo"] == "Sismo 7.2 Mw"
    # indice_marginacion=90, indice_pobreza=85, coeficiente_emergencia=90 (seed_comunidad)
    # (0.4*90) + (0.4*85) + (0.2*90) = 36 + 34 + 18 = 88.00 -> ya recalculado, no el score por defecto
    assert body["score_urgencia"] == "88.00"
    assert body["clasificacion"] == "Prioridad Crítica"


async def test_desactivar_alerta_sin_rol_admin_devuelve_403(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Transportista"])
    resp = await client.patch(
        f"/api/v1/comunidades/{seed_comunidad}/alerta-emergencia",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


async def test_desactivar_alerta_como_administrador_devuelve_200(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    await client.post(
        f"/api/v1/comunidades/{seed_comunidad}/alerta-emergencia",
        json={"coeficiente_emergencia": 90, "motivo": "Sismo 7.2 Mw", "activa": True},
        headers={"Authorization": f"Bearer {token}"},
    )

    resp = await client.patch(
        f"/api/v1/comunidades/{seed_comunidad}/alerta-emergencia",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["alerta_activa"] is False
    assert body["alerta_motivo"] == "Sismo 7.2 Mw"  # se conserva como histórico
