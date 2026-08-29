# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Tlapiani is a humanitarian-aid traceability and prioritization system for disaster relief in Mexico. It has two purposes: (1) rank which vulnerable communities receive aid first via a computed "Score de Urgencia", and (2) guarantee aid packages aren't tampered with in transit via a SHA-256 chain-of-custody seal that is verified offline in the field.

The system is split into three planned services, described in `README.md` (root) and each subdirectory's own `README.md`:

- **`backend/`** — FastAPI + MariaDB, bare-metal deploy (systemd + Apache reverse proxy). **Implemented** (see Architecture (backend) below).
- **`dashboard/`** — Dependency-free vanilla JS SPA (hash router, native `<dialog>`, Web Crypto SHA-256, CDN-loaded Leaflet/GSAP/QR). **Implemented and wired to the real backend** (see Architecture (dashboard) below). This used to be `dashboard/vanilla/`, promoted to `dashboard/` after the earlier Next.js 14 implementation that lived at this path was removed — it never got past a broken `lib/`-less build and duplicated/mocked auth, and the team decided to keep only the vanilla dashboard going forward. Don't resurrect the Next.js app from git history without checking with the team first.
- **`mobile/`** — Flutter app for last-mile QR scanning and offline hash verification. **Spec only — no code exists yet**, just `mobile/README.md`.

This directory (`Tlapiani/`) is its own git repository (remote: `gabo10-FS/Tlapiani`), separate from any outer repo it may be nested inside.

A formal requirements document — `Descripción_Tlapiani.pdf` at the outer `Fepro/` root (one level above this repo), numbered RF-1.x/RF-2.x/RF-3.x and RNF-1.x–3.x — is the authoritative functional/non-functional spec. It disagrees with `backend/README.md` on two points, both resolved deliberately in favor of the README: DB engine (PDF says PostgreSQL, backend uses **MariaDB**) and deployment (PDF wants Docker/RNF-3.1, backend stays **bare-metal**, no containers). Treat these as settled unless the user says otherwise — don't re-litigate them from the PDF alone.

When implementing `mobile/`, the API contracts in the root `README.md` and `backend/README.md` (endpoints, JSON payloads, DB schema, the Score de Urgencia formula, the hash format pinned in `backend/app/services/integridad_service.py`) are the source of truth — they must stay consistent with what `dashboard/js/api.js` already expects.

## Commands

### Backend (`backend/`)

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then point DATABASE_URL at a real MariaDB instance
alembic upgrade head            # creates schema + immutability triggers
uvicorn app.main:app --reload --port 8000
pytest                          # unit tests for services/ — pure functions, no DB needed
```

`alembic upgrade head --sql` dry-runs the migration to plain SQL without needing a live DB connection — useful for checking the migration compiles after editing it.

### Dashboard (`dashboard/`)

No build step, no dependencies to install — plain HTML/CSS/JS served as-is. It needs a real HTTP server (ES modules/`fetch` don't work from `file://`) and an internet connection (GSAP, Leaflet, and the QR generator load from CDN):

```bash
cd dashboard
python3 -m http.server 8099   # or: npx serve .  /  start-demo.bat on Windows / node serve.js
```

Open http://localhost:8099. There is no automated test runner for this frontend.

To point it at the real backend instead of its built-in mocks, `js/api.js` already has `API_BASE = 'http://127.0.0.1:8000'` and `DEMO_MODE = false` — see the block comment at the top of that file for exactly which endpoints are real vs. still mocked (the backend doesn't expose a few things the dashboard's UI has slots for, e.g. listing all lotes, galería, historias/noticias — see `backend/INTEGRACION.md`). Run the backend first (below), then this. **CORS**: the backend's `CORS_ORIGINS` must include `http://localhost:8099` (and `http://127.0.0.1:8099`) or the browser will block every request — both `.env` and `.env.example` already list them alongside the old `:3000` origin.

## Architecture (backend)

Standard layered FastAPI layout: `app/models` (SQLAlchemy ORM) → `app/schemas` (Pydantic request/response) → `app/services` (business logic, DB-agnostic where possible) → `app/api/v1` (routers, one file per resource, aggregated in `app/api/v1/router.py`). `app/core/config.py` holds `Settings` (pydantic-settings, reads `.env`); `app/core/security.py` has password hashing + JWT encode/decode.

- **Async end-to-end**: SQLAlchemy async engine over `aiomysql` (not the sync `pymysql` the original README sketch used) — required for RNF-2.2 (API must handle concurrent requests without degrading). Alembic itself runs synchronously; `migrations/env.py` derives a `pymysql` URL from `DATABASE_URL` by string-replacing the driver, so there's only one URL to maintain in `.env`.
- **Roles are `Administrador | Donante | Transportista`** (`app/models/usuario.py::ROLES_VALIDOS`) — matches RF-2.1 and the dashboard's `usuarios.js` view. Note this contradicts the *comment* in the original DDL sketch (which said `Voluntario`) and doesn't cleanly match `mobile/README.md`'s description of app users as "voluntarios" — the mobile app's field actors are treated as `Transportista` for now (see `/envios/sincronizar`'s allowed roles in `app/api/v1/envios.py`). Revisit if a dedicated volunteer role turns out to be needed.
- **Lote ID generation is concurrency-safe by design**: `app/services/integridad_service.py::siguiente_lote_id` uses `INSERT ... ON DUPLICATE KEY UPDATE ultimo_numero = ultimo_numero + 1` against the `lote_secuencias` table (one row per year) — atomic in MariaDB without explicit row locking. Don't replace this with a `SELECT COUNT(*) + 1` pattern; it races under concurrent dispatch.
- **The chain-of-custody hash format is pinned** in `app/services/integridad_service.py::generar_sello`: pipe-separated fields, `cantidad_kg` formatted to exactly 2 decimals, timestamp as `%Y-%m-%dT%H:%M:%SZ` (UTC, no microseconds), UTF-8 encoded. Any client that recomputes this hash offline (future mobile app, `dashboard`) must reproduce this exact format or verification will spuriously fail — this is the concrete answer to what `backend/README.md`'s "Módulo B" formula left ambiguous.
- **Three endpoints exist beyond the original `backend/README.md` contract**, added to close design gaps the requirements PDF didn't specify: `POST /usuarios/registrar` + `GET /usuarios` (user provisioning, RF-2.1), `POST /donaciones/{lote_id}/despachar` (Creado → En Ruta transition, RF-1.4/RF-2.3 — only legal from `Creado`, 409s otherwise), and `POST /comunidades/{id}/alerta-emergencia` + `POST /comunidades/recalcular` (manual CENAPRED alert ingestion + bulk recompute, RF-1.1 — there's no stable public CENAPRED feed to poll, so ingestion is admin-triggered by design, not a gap to "fix" later). All three are documented with full payload/response examples in `backend/README.md`.
- **`envios_bitacora` is the only immutable table** (RNF-1.1, enforced by `trg_prevent_update_bitacora`/`trg_prevent_delete_bitacora` in the migration) — `lotes.estado_actual` is intentionally mutable, since it's a live state machine (`Creado → En Ruta → Entregado Exitosamente | Alerta de Manipulación`), not the audit ledger.
- **Deploy artifacts are versioned in `backend/deploy/`** (`tlapiani-backend.service`, `tlapiani.conf`) rather than only described in prose — copy them into `/etc/systemd/system/` and `/etc/apache2/sites-available/` rather than retyping from the README.

## Architecture (dashboard)

### Structure

Hash router (`js/router.js`, `#/inventario`, `#/prioridad`, ...) drives view mounting; each `js/views/<name>.js` exports a `mount<Name>(root)` that renders into `#view-root` and registers its own GSAP context (see below). `js/app.js` is the bootstrap: theme, session, login dialog, route registration. `js/api.js` is the only module that talks to the backend — views never call `fetch` directly. Design system lives in `css/styles.css` (HSL tokens, dark-mode-first glassmorphism — documented in `dashboard/README.md`).

Views: `inventario`, `mapa` (Leaflet, prioridad), `despacho` (QR + hash), `transparencia` (público, no auth), `usuarios` (RF-2.1, solo Administrador), plus `bienvenida`/`publico`/`galeria` which stay purely on mock data — the backend has no endpoints for those yet (public comunidad listing, galería, historias, noticias).

### `js/api.js` — real backend for what exists, honest mocks for what doesn't

`DEMO_MODE = false` and `API_BASE = 'http://127.0.0.1:8000'` are set, but this isn't a single on/off switch: each function in `api.js` either calls the real FastAPI endpoint or falls back to `mock/data.js`, function by function, with a comment saying which and why. The real backend only covers auth/login, usuarios (registrar+listar, Administrador-only), comunidades/prioridad, donaciones (registrar, despachar, historial), matching exactly the 6 endpoints in `backend/README.md`'s contract. Notably **there is no `GET` to list all lotes** — `api.lotes()` keeps an in-session cache seeded by `crearLote()`/`despachar()` results rather than inventing an endpoint the backend doesn't have. Don't "finish" this by making every function hit the network; check `backend/openapi.json` (`GET /openapi.json` on a running instance) before assuming an endpoint exists.

### Auth

Real JWT from `POST /api/v1/auth/login` (email + password, not username). The backend's `TokenResponse` only returns `access_token` and `rol` — no `nombre_completo` — so the session object the frontend keeps is `{ email, rol }`; UI falls back to showing the email where a display name would go. Demo credentials from `backend/seed_demo.py`: `rubenguzman647@gmail.com` / `admin123` (Administrador).

### GSAP pattern

Every view wraps its animations via `runViewAnimations(root, fn)` in `js/animations.js`, which opens a `gsap.context()` scoped to that view's DOM and reverts it (killing tweens + ScrollTriggers) on the next route change via `cleanupView()` in `router.js`. Animate only `transform`/`opacity` (via `autoAlpha`), use `ScrollTrigger.batch` for list entrances instead of per-item tweens, and never animate something that ends up invisible/blocking clicks.

## Cross-cutting domain logic

These two computations are shared across all three services (backend computes/verifies them; dashboard displays and generates them; mobile will recompute them offline) — any implementation must match exactly:

**Score de Urgencia**: `SU = α·IM + β·IE + γ·CE`, weights constrained to `α + β + γ = 1` (configurable via backend env vars `PRIORIDAD_ALPHA`/`BETA`/`GAMMA`). Classification bands used by `dashboard/js/views/mapa.js`: score ≥ 80 → *Prioridad Crítica* (crimson), 50–79 → *Prioridad Alta* (amber), < 50 → *Prioridad Baja/Segura* (emerald).

**Chain-of-custody seal**: `Sello = SHA-256(ID_Lote || Tipo_Bien || Cantidad || Destino || Timestamp)`, computed server-side at dispatch and recomputed client-side offline (Web Crypto in `dashboard`, and eventually the `crypto` package in the Flutter app) at delivery to detect tampering. The exact serialization is no longer ambiguous — `backend/app/services/integridad_service.py::generar_sello` is the reference implementation: pipe-separated, `cantidad_kg` as `.2f`, timestamp as `%Y-%m-%dT%H:%M:%SZ` UTC, UTF-8. Any offline client must byte-for-byte match that function's output or verification will spuriously fail.
