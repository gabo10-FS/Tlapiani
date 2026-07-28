# Tlapiani — Dashboard SPA (Vanilla JS)

SPA de trazabilidad humanitaria en **JavaScript puro** (sin framework): router por hash,
`<dialog>` nativos, Leaflet, QR en `<canvas>` y animaciones GSAP. Es independiente del
proyecto Next.js/React que vive en la carpeta padre.

## Cómo ejecutar

Requiere un servidor HTTP (los ES modules y `fetch` no funcionan desde `file://`):

```bash
cd vanilla
python3 -m http.server 8099
# o:  npx serve .
```

Abre http://localhost:8099

> Necesita conexión a internet: GSAP, Leaflet y el generador de QR se cargan desde CDN.

## Acceso demo

- Usuario: **admin** — Contraseña: **tlapiani**
- El **Portal de Transparencia** es público (no requiere login). Prueba los IDs
  `TLAP-2026-9981` (en ruta), `TLAP-2026-9974` (recibido OK) y `TLAP-2026-9968`
  (⚠ alerta de manipulación).

## Estructura

```
index.html            Shell, sidebar, topbar y <dialog> de login/QR
css/styles.css        Sistema de diseño (HSL dark/light, glass, print)
js/
  app.js              Bootstrap: tema, sesión, login, rutas
  router.js           Router SPA por hash (#/…) + guards de auth
  api.js              Fetch + JWT (Bearer) + interceptor 401 + modo demo
  animations.js       GSAP: contexto por vista, cleanup, ScrollTrigger
  mock/data.js        Datos simulados de los endpoints
  views/
    inventario.js     Formulario (datalist, :user-valid) + tabla filtrable
    mapa.js           Leaflet + CartoDB Dark + marcadores por urgencia
    despacho.js       Hash SHA-256 (Web Crypto) + QR canvas + imprimir
    transparencia.js  Buscador público + línea de tiempo de custodia
    ui.js             Helpers compartidos
```

## Conectar un backend real

En `js/api.js` pon `DEMO_MODE = false` y define `API_BASE`. Las funciones de `api`
ya llaman a `/api/v1/...` con el header `Authorization: Bearer <JWT>` y redirigen al
login ante un `401`.
