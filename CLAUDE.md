# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Tlapiani is a humanitarian-aid traceability and prioritization system for disaster relief in Mexico. It has two purposes: (1) rank which vulnerable communities receive aid first via a computed "Score de Urgencia", and (2) guarantee aid packages aren't tampered with in transit via a SHA-256 chain-of-custody seal that is verified offline in the field.

The system is split into three planned services, described in `README.md` (root) and each subdirectory's own `README.md`:

- **`backend/`** — FastAPI + MariaDB, bare-metal deploy (systemd + Apache reverse proxy). **Implemented** (see Architecture (backend) below).
- **`dashboard/`** — Next.js 14 admin dashboard + public transparency portal. Implemented, but with real gaps (see Architecture (dashboard) below).
- **`mobile/`** — Flutter app for last-mile QR scanning and offline hash verification. **Spec only — no code exists yet**, just `mobile/README.md`.

This directory (`Tlapiani/`) is its own git repository (remote: `gabo10-FS/Tlapiani`), separate from any outer repo it may be nested inside.

A formal requirements document — `Descripción_Tlapiani.pdf` at the outer `Fepro/` root (one level above this repo), numbered RF-1.x/RF-2.x/RF-3.x and RNF-1.x–3.x — is the authoritative functional/non-functional spec. It disagrees with `backend/README.md` on two points, both resolved deliberately in favor of the README: DB engine (PDF says PostgreSQL, backend uses **MariaDB**) and deployment (PDF wants Docker/RNF-3.1, backend stays **bare-metal**, no containers). Treat these as settled unless the user says otherwise — don't re-litigate them from the PDF alone.

When implementing `mobile/`, the API contracts in the root `README.md` and `backend/README.md` (endpoints, JSON payloads, DB schema, the Score de Urgencia formula, the hash format pinned in `backend/app/services/integridad_service.py`) are the source of truth — they must stay consistent with what `dashboard/modules/*/services/*.api.ts` already expects.

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

```bash
cd dashboard
npm install
npm run dev      # start dev server
npm run build
npm run start     # serve production build
npm run lint      # next lint
```

There is no test runner configured — no test script in `package.json`, and none of Vitest/Testing Library/Playwright (mentioned as a future plan in `arquitectura-inicial.md`) are installed yet.

The standalone vanilla demo under `dashboard/vanilla/` needs a plain HTTP server (ES modules/`fetch` don't work from `file://`) and an internet connection (GSAP, Leaflet, and the QR generator load from CDN):

```bash
cd dashboard/vanilla
python3 -m http.server 8099   # or: npx serve .  /  start-demo.bat on Windows
```

## Architecture (backend)

Standard layered FastAPI layout: `app/models` (SQLAlchemy ORM) → `app/schemas` (Pydantic request/response) → `app/services` (business logic, DB-agnostic where possible) → `app/api/v1` (routers, one file per resource, aggregated in `app/api/v1/router.py`). `app/core/config.py` holds `Settings` (pydantic-settings, reads `.env`); `app/core/security.py` has password hashing + JWT encode/decode.

- **Async end-to-end**: SQLAlchemy async engine over `aiomysql` (not the sync `pymysql` the original README sketch used) — required for RNF-2.2 (API must handle concurrent requests without degrading). Alembic itself runs synchronously; `migrations/env.py` derives a `pymysql` URL from `DATABASE_URL` by string-replacing the driver, so there's only one URL to maintain in `.env`.
- **Roles are `Administrador | Donante | Transportista`** (`app/models/usuario.py::ROLES_VALIDOS`) — matches RF-2.1 and the dashboard's existing `RolUsuario` type. Note this contradicts the *comment* in the original DDL sketch (which said `Voluntario`) and doesn't cleanly match `mobile/README.md`'s description of app users as "voluntarios" — the mobile app's field actors are treated as `Transportista` for now (see `/envios/sincronizar`'s allowed roles in `app/api/v1/envios.py`). Revisit if a dedicated volunteer role turns out to be needed.
- **Lote ID generation is concurrency-safe by design**: `app/services/integridad_service.py::siguiente_lote_id` uses `INSERT ... ON DUPLICATE KEY UPDATE ultimo_numero = ultimo_numero + 1` against the `lote_secuencias` table (one row per year) — atomic in MariaDB without explicit row locking. Don't replace this with a `SELECT COUNT(*) + 1` pattern; it races under concurrent dispatch.
- **The chain-of-custody hash format is pinned** in `app/services/integridad_service.py::generar_sello`: pipe-separated fields, `cantidad_kg` formatted to exactly 2 decimals, timestamp as `%Y-%m-%dT%H:%M:%SZ` (UTC, no microseconds), UTF-8 encoded. Any client that recomputes this hash offline (future mobile app, `dashboard/vanilla`) must reproduce this exact format or verification will spuriously fail — this is the concrete answer to what `backend/README.md`'s "Módulo B" formula left ambiguous.
- **Three endpoints exist beyond the original `backend/README.md` contract**, added to close design gaps the requirements PDF didn't specify: `POST /usuarios/registrar` + `GET /usuarios` (user provisioning, RF-2.1), `POST /donaciones/{lote_id}/despachar` (Creado → En Ruta transition, RF-1.4/RF-2.3 — only legal from `Creado`, 409s otherwise), and `POST /comunidades/{id}/alerta-emergencia` + `POST /comunidades/recalcular` (manual CENAPRED alert ingestion + bulk recompute, RF-1.1 — there's no stable public CENAPRED feed to poll, so ingestion is admin-triggered by design, not a gap to "fix" later). All three are documented with full payload/response examples in `backend/README.md`.
- **`envios_bitacora` is the only immutable table** (RNF-1.1, enforced by `trg_prevent_update_bitacora`/`trg_prevent_delete_bitacora` in the migration) — `lotes.estado_actual` is intentionally mutable, since it's a live state machine (`Creado → En Ruta → Entregado Exitosamente | Alerta de Manipulación`), not the audit ledger.
- **Deploy artifacts are versioned in `backend/deploy/`** (`tlapiani-backend.service`, `tlapiani.conf`) rather than only described in prose — copy them into `/etc/systemd/system/` and `/etc/apache2/sites-available/` rather than retyping from the README.

## Architecture (dashboard)

### Module encapsulation

Feature logic lives under `modules/<name>/{components,hooks,services,types}` for `inventario`, `mapa`, `despacho`, `transparencia`. Each module is meant to stay self-contained: its components should only import from `components/ui`, `components/data-display`, `components/feedback`, and `lib/`, never from another module directly. Routes under `app/(admin)/` and `app/(public)/` are thin pages that compose module components.

Route groups:
- `app/(admin)/` — authenticated area (`inventario`, `mapa`, `despacho`)
- `app/(public)/` — public "Portal de Transparencia" (no auth), lets anyone look up a `lote_id` and see its custody timeline

### ⚠️ `lib/` directory does not exist — build is currently broken

`middleware.ts`, all three routes under `app/api/auth/`, `app/(admin)/layout.tsx`, and `modules/inventario/services/inventario.api.ts` import from `@/lib/auth/session`, `@/lib/auth/guards`, and `@/lib/api/client` — but there is no `lib/` directory anywhere in `dashboard/`. These modules need to be created before the app will typecheck/build. `arquitectura-inicial.md` §4 contains a full reference implementation of `lib/auth/session.ts` (JWT session cookie via `jose`), `lib/auth/guards.tsx` (`AuthGuard`), and `lib/api/client.ts` (Axios instance with a 401 refresh interceptor) — treat it as a spec to implement, not as code that exists.

### Auth is currently mocked, and duplicated inconsistently

`app/api/auth/login/route.ts` checks credentials against a hardcoded `USUARIOS_DEV` array instead of calling the FastAPI backend, and calls the not-yet-existing `setSession()`. Separately, `middleware.ts` re-implements JWT verification inline (with a hardcoded fallback `SESSION_SECRET`) instead of reusing `lib/auth/session` — its protected-route matcher (`/(inventario|mapa|despacho)`) also doesn't match the route-group path scheme actually used (`app/(admin)/...`). When building out `lib/auth/session.ts`, reconcile these two auth code paths rather than leaving both.

### Two independent frontends — don't conflate them

`dashboard/vanilla/` is a separate, dependency-free implementation of the same dashboard (hash router, native `<dialog>`, Web Crypto SHA-256, CDN-loaded Leaflet/GSAP/QR), with its own mock data (`js/mock/data.js`) and demo login (`admin` / `tlapiani`). It's unrelated to the Next.js app in `dashboard/` beyond sharing the same product spec — check which one a request is actually about before editing.

### Two different visual designs coexist

`tailwind.config.ts` defines a light, sky-blue/emerald corporate palette with a dark sidebar — this is what the Next.js app (`app/`, `modules/`, `components/`) actually uses. `dashboard/README.md` separately specifies an HSL-based dark-mode-first glassmorphism system (emerald/amber/crimson accents, `--glass-bg`, `backdrop-filter`) — that scheme is what `dashboard/vanilla/css/styles.css` follows. These are not the same design; match tokens to whichever surface (Next.js app vs. vanilla) is being edited.

### GSAP pattern (Next.js app)

Follow `arquitectura-inicial.md` §3: wrap animations in `useGSAP(() => {...}, { scope: ref })` for automatic cleanup, animate only `x`/`y`/`opacity`/`scale` (never layout properties), use `stagger` for list entrance animations instead of per-item tweens, and `gsap.quickTo()` for frequently-updated values like progress bars.

## Cross-cutting domain logic

These two computations are shared across all three services (backend computes/verifies them; dashboard displays and generates them; mobile will recompute them offline) — any implementation must match exactly:

**Score de Urgencia**: `SU = α·IM + β·IE + γ·CE`, weights constrained to `α + β + γ = 1` (configurable via backend env vars `PRIORIDAD_ALPHA`/`BETA`/`GAMMA`). Classification bands used by `modules/mapa`: score ≥ 80 → *Prioridad Crítica* (crimson), 50–79 → *Prioridad Alta* (amber), < 50 → *Prioridad Baja/Segura* (emerald).

**Chain-of-custody seal**: `Sello = SHA-256(ID_Lote || Tipo_Bien || Cantidad || Destino || Timestamp)`, computed server-side at dispatch and recomputed client-side offline (Web Crypto in `dashboard/vanilla`, and eventually the `crypto` package in the Flutter app) at delivery to detect tampering. The exact serialization is no longer ambiguous — `backend/app/services/integridad_service.py::generar_sello` is the reference implementation: pipe-separated, `cantidad_kg` as `.2f`, timestamp as `%Y-%m-%dT%H:%M:%SZ` UTC, UTF-8. Any offline client must byte-for-byte match that function's output or verification will spuriously fail.
