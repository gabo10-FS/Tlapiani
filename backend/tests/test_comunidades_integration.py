"""Integración HTTP real para /api/v1/comunidades/*. Ver tests/conftest.py."""

import pytest

pytestmark = pytest.mark.asyncio


async def test_listar_prioridad_sin_token_devuelve_200(client, seed_comunidad):
    # Público a propósito: el sitio de visitantes (publico.js) lo llama sin
    # sesión para el mapa de prioridad y el buscador "Ubica tu estado".
    resp = await client.get("/api/v1/comunidades/prioridad")
    assert resp.status_code == 200
    comunidades = resp.json()
    assert len(comunidades) == 1
    assert comunidades[0]["comunidad_id"] == seed_comunidad


async def test_listar_prioridad_con_cualquier_rol_autenticado_devuelve_200(
    client, seed_usuarios, seed_comunidad, login_as
):
    # También funciona autenticado (lo usa el mapa interno de administración)
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


async def test_recalcular_sin_rol_admin_devuelve_403(client, seed_usuarios, seed_comunidad, login_as):
    token = await login_as(client, seed_usuarios["Transportista"])
    resp = await client.post(
        "/api/v1/comunidades/recalcular", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403


async def test_recalcular_como_administrador_devuelve_200_y_recalcula_de_verdad(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])

    # seed_comunidad no llama a ningún endpoint de recálculo -- score_urgencia
    # queda en su default (0) hasta que algo lo dispare. Se confirma eso antes
    # de recalcular para que el test pruebe un cambio real, no solo un 200.
    antes = await client.get(
        "/api/v1/comunidades/prioridad", headers={"Authorization": f"Bearer {token}"}
    )
    assert antes.json()[0]["score_urgencia"] == "0.00"

    resp = await client.post(
        "/api/v1/comunidades/recalcular", headers={"Authorization": f"Bearer {token}"}
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["comunidades_actualizadas"] == 1  # solo seed_comunidad existe en este test
    assert "timestamp" in body

    despues = await client.get(
        "/api/v1/comunidades/prioridad", headers={"Authorization": f"Bearer {token}"}
    )
    # indice_marginacion=90, indice_pobreza=85, coeficiente_emergencia=0 (seed_comunidad)
    # (0.4*90) + (0.4*85) + (0.2*0) = 36 + 34 + 0 = 70.00
    assert despues.json()[0]["score_urgencia"] == "70.00"
