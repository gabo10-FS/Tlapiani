"""Tipo de campo para fechas en las respuestas.

`FechaUtcZ` serializa cualquier `datetime` (que por convención del backend se
guarda en UTC naïve, ver app/core/time.py) como `'YYYY-MM-DDTHH:MM:SSZ'` —
segundos enteros, sufijo `Z`, sin microsegundos. Es EXACTAMENTE el mismo formato
que el timestamp del sello SHA-256 (`integridad_service.generar_sello`), para que
un cliente que parsee las respuestas y uno que recalcule el sello vean lo mismo.

Solo afecta la serialización a JSON (`when_used="json-unless-none"`): en modo
Python el valor sigue siendo un `datetime` (útil en tests).
"""

from datetime import datetime
from typing import Annotated

from pydantic import PlainSerializer

from app.core.time import formatear_utc_z

FechaUtcZ = Annotated[
    datetime,
    PlainSerializer(formatear_utc_z, return_type=str, when_used="json-unless-none"),
]
