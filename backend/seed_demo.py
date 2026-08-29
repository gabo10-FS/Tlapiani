"""Script de siembra para desarrollo local — NO se ejecuta en producción.

Crea el primer usuario Administrador (huevo-y-gallina: /usuarios/registrar
exige un JWT de Administrador que todavía no existe) y un set de comunidades
de ejemplo con su score de urgencia calculado por el motor real
(app.services.priorizacion_service), no hardcodeado.
"""

import asyncio
from decimal import Decimal

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.comunidad import Comunidad
from app.models.usuario import Usuario
from app.services.priorizacion_service import _aplicar_score

COMUNIDADES_DEMO = [
    # nombre, estado, lat, lng, indice_marginacion, indice_pobreza, coeficiente_emergencia
    ("San Juan Chamula", "Chiapas", 16.786, -92.688, 92, 88, 0),
    ("Santa María Tlahuitoltepec", "Oaxaca", 17.055, -95.998, 85, 82, 0),
    ("Metlatónoc", "Guerrero", 17.192, -98.404, 84, 80, 0),
    ("Mezquitic", "Jalisco", 22.394, -103.720, 68, 65, 10),
    ("Batopilas", "Chihuahua", 27.024, -107.735, 62, 60, 15),
    ("Cochoapa el Grande", "Guerrero", 17.166, -98.660, 95, 90, 0),
    ("Del Nayar", "Nayarit", 22.220, -104.470, 55, 52, 5),
    ("Aldama", "Chiapas", 16.905, -92.700, 40, 38, 0),
    ("Coicoyán de las Flores", "Oaxaca", 17.267, -98.283, 76, 73, 0),
    ("Guachochi", "Chihuahua", 26.816, -107.070, 35, 32, 0),
]

USUARIOS_DEMO = [
    ("Ruben Guzmán", "rubenguzman647@gmail.com", "admin123", "Administrador"),
    ("Admin Tlapiani", "admin@tlapiani.mx", "admin123", "Administrador"),
    ("Carlos Mendoza", "carlos.mendoza@tlapiani.mx", "pass123", "Transportista"),
    ("Sofía Ramírez", "sofia.ramirez@tlapiani.mx", "pass123", "Transportista"),
    ("Cruz Roja Oaxaca", "contacto@cruzroja-oax.org", "pass123", "Donante"),
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        for nombre, email, password, rol in USUARIOS_DEMO:
            db.add(Usuario(
                nombre_completo=nombre, email=email,
                password_hash=hash_password(password), rol=rol,
            ))

        for nombre, estado, lat, lng, im, ip, ce in COMUNIDADES_DEMO:
            c = Comunidad(
                nombre=nombre, estado=estado,
                latitud=Decimal(str(lat)), longitud=Decimal(str(lng)),
                indice_marginacion=Decimal(str(im)),
                indice_pobreza=Decimal(str(ip)),
                coeficiente_emergencia=Decimal(str(ce)),
            )
            _aplicar_score(c)  # calcula score_urgencia + clasificacion con el motor real
            db.add(c)

        await db.commit()
    print(f"Sembrados: {len(USUARIOS_DEMO)} usuarios, {len(COMUNIDADES_DEMO)} comunidades.")


if __name__ == "__main__":
    asyncio.run(seed())
