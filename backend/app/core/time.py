"""Convención de tiempo del backend.

TODO instante se maneja y se guarda en **UTC**, **truncado a segundos enteros**,
y se serializa en las respuestas como ``YYYY-MM-DDTHH:MM:SSZ``.

- **Segundos enteros**: el sello SHA-256 (``integridad_service.generar_sello``)
  se calcula sobre el timestamp con precisión de segundos. ``created_at`` debe
  guardar EXACTAMENTE ese instante para que el recálculo offline del móvil
  (``sync_service``) cuadre. Guardar microsegundos rompería esa igualdad según
  cómo el motor redondee/trunque un ``DATETIME`` sin precisión fraccionaria.
- **Naïve**: las columnas ``DATETIME`` de MariaDB no llevan zona horaria. Se
  guarda el valor UTC sin ``tzinfo`` por convención en todo el backend; la
  ``Z`` se agrega al serializar (``formatear_utc_z``). Nunca se usa
  ``func.now()`` como default de columna: en MariaDB devuelve la hora **local**
  del servidor, no UTC.
"""

from datetime import datetime, timezone


def ahora_utc() -> datetime:
    """Instante actual en UTC, truncado a segundos, sin ``tzinfo``."""
    return datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)


def a_utc_naive(momento: datetime) -> datetime:
    """Normaliza un ``datetime`` a UTC naïve truncado a segundos.

    Un ``datetime`` con ``tzinfo`` se convierte a UTC; uno sin ``tzinfo`` se
    asume que ya está en UTC.
    """
    if momento.tzinfo is not None:
        momento = momento.astimezone(timezone.utc).replace(tzinfo=None)
    return momento.replace(microsecond=0)


def formatear_utc_z(momento: datetime) -> str:
    """``datetime`` (se asume UTC) -> ``'YYYY-MM-DDTHH:MM:SSZ'``."""
    return momento.strftime("%Y-%m-%dT%H:%M:%S") + "Z"
