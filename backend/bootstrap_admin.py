"""Bootstrap de arranque — crea el primer Administrador real + comunidades
de ejemplo. Reemplaza a seed_demo.py (que sembraba 5 usuarios y contraseñas
de prueba tipo "admin123" directamente en el código).

Por qué existe: `POST /api/v1/usuarios/registrar` exige un JWT de
Administrador, pero para sacar ese JWT hace falta un Administrador ya
creado (huevo y gallina). Este script rompe ese ciclo creando exactamente
UN administrador real — el resto de usuarios (Transportistas, Donantes,
otros Administradores) se dan de alta después, con datos reales, desde la
pantalla "Usuarios" del dashboard (ya funcional, ver dashboard/js/views/usuarios.js).

La contraseña NUNCA se escribe en este archivo ni se pasa por línea de
comandos (para que no quede en el historial de la shell ni en el código):
se toma de la variable de entorno ADMIN_PASSWORD, o si no está definida,
se pide de forma oculta con getpass.

Uso:
    # opción A: variables de entorno (útil para correrlo sin que nadie vea la terminal)
    ADMIN_EMAIL=correo@dominio.com ADMIN_NAME="Nombre Apellido" ADMIN_PASSWORD='...' python bootstrap_admin.py

    # opción B: interactivo (pide lo que falte, la contraseña no se muestra en pantalla)
    python bootstrap_admin.py

Es idempotente para las comunidades (si ya hay, no vuelve a insertarlas).
Para el usuario: si ya existe alguien con ese email, pregunta si quieres
actualizarle la contraseña a la que acabas de escribir (por ejemplo, si
antes se creó con seed_demo.py y sigue teniendo la contraseña de prueba
"admin123") en vez de dejarlo tal cual sin avisar.

Las comunidades de ejemplo se marcan con el prefijo "[EJEMPLO]" en el
nombre para que nadie las confunda con datos reales en un vistazo al mapa
o al listado — bórralas o reemplázalas por comunidades reales en cuanto
existan (hoy no hay endpoint para dar de alta comunidades; ver
CLAUDE.md / respuesta-backend-2026-08-25.md para esa decisión pendiente).
"""

import asyncio
import getpass
import os
from decimal import Decimal

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.comunidad import Comunidad
from app.models.usuario import Usuario
from app.services.priorizacion_service import _aplicar_score

COMUNIDADES_EJEMPLO = [
    # nombre, estado, lat, lng, indice_marginacion, indice_pobreza, coeficiente_emergencia
    ("[EJEMPLO] San Juan Chamula", "Chiapas", 16.786, -92.688, 92, 88, 0),
    ("[EJEMPLO] Santa María Tlahuitoltepec", "Oaxaca", 17.055, -95.998, 85, 82, 0),
    ("[EJEMPLO] Metlatónoc", "Guerrero", 17.192, -98.404, 84, 80, 0),
    ("[EJEMPLO] Mezquitic", "Jalisco", 22.394, -103.720, 68, 65, 10),
    ("[EJEMPLO] Batopilas", "Chihuahua", 27.024, -107.735, 62, 60, 15),
    ("[EJEMPLO] Cochoapa el Grande", "Guerrero", 17.166, -98.660, 95, 90, 0),
    ("[EJEMPLO] Del Nayar", "Nayarit", 22.220, -104.470, 55, 52, 5),
    ("[EJEMPLO] Aldama", "Chiapas", 16.905, -92.700, 40, 38, 0),
    ("[EJEMPLO] Coicoyán de las Flores", "Oaxaca", 17.267, -98.283, 76, 73, 0),
    ("[EJEMPLO] Guachochi", "Chihuahua", 26.816, -107.070, 35, 32, 0),
]


def _leer_password() -> str:
    pw = os.environ.get("ADMIN_PASSWORD")
    if pw:
        return pw
    while True:
        pw1 = getpass.getpass("Contraseña para el administrador (no se muestra en pantalla): ")
        if len(pw1) < 8:
            print("Debe tener al menos 8 caracteres.")
            continue
        pw2 = getpass.getpass("Repite la contraseña: ")
        if pw1 != pw2:
            print("No coinciden, intenta de nuevo.")
            continue
        return pw1


async def bootstrap() -> None:
    email = os.environ.get("ADMIN_EMAIL") or input("Email del administrador [rubenguzman647@gmail.com]: ") or "rubenguzman647@gmail.com"
    nombre = os.environ.get("ADMIN_NAME") or input("Nombre completo [Ruben Guzmán]: ") or "Ruben Guzmán"
    password = _leer_password()

    async with AsyncSessionLocal() as db:
        existe = (await db.execute(select(Usuario).where(Usuario.email == email))).scalar_one_or_none()
        if existe:
            resp = input(
                f"Ya existe un usuario con el email {email!r} (rol={existe.rol}). "
                "¿Actualizar su contraseña a la que acabas de escribir? [s/N]: "
            ).strip().lower()
            if resp == "s":
                existe.password_hash = hash_password(password)
                if existe.rol != "Administrador":
                    existe.rol = "Administrador"
                print(f"Contraseña actualizada para {email!r}.")
            else:
                print("No se modificó el usuario existente.")
        else:
            db.add(Usuario(
                nombre_completo=nombre, email=email,
                password_hash=hash_password(password), rol="Administrador",
            ))
            print(f"Administrador creado: {nombre} <{email}>.")

        total_comunidades = (await db.execute(select(func.count()).select_from(Comunidad))).scalar_one()
        if total_comunidades > 0:
            print(f"Ya hay {total_comunidades} comunidades en la base — no se agregan las de ejemplo de nuevo.")
        else:
            for nombre_c, estado, lat, lng, im, ip, ce in COMUNIDADES_EJEMPLO:
                c = Comunidad(
                    nombre=nombre_c, estado=estado,
                    latitud=Decimal(str(lat)), longitud=Decimal(str(lng)),
                    indice_marginacion=Decimal(str(im)),
                    indice_pobreza=Decimal(str(ip)),
                    coeficiente_emergencia=Decimal(str(ce)),
                )
                _aplicar_score(c)  # calcula score_urgencia + clasificacion con el motor real
                db.add(c)
            print(f"{len(COMUNIDADES_EJEMPLO)} comunidades de ejemplo agregadas (marcadas con \"[EJEMPLO]\").")

        await db.commit()

    print("\nListo. Para agregar Transportistas/Donantes reales, entra como este")
    print("administrador y usa la pantalla \"Usuarios\" del dashboard — ya no hace")
    print("falta tocar la base de datos a mano ni este script.")


if __name__ == "__main__":
    asyncio.run(bootstrap())
