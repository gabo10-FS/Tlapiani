# Tlapiani — Arquitectura Inicial del Frontend
**Dashboard Administrativo Web + Portal de Transparencia**
> Documento de referencia para el artículo IEEE y la documentación técnica del proyecto.

---

## 1. Stack Tecnológico

### Decisiones principales

| Capa | Herramienta | Justificación |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | SSR/SSG nativo para el Portal de Transparencia público; RSC reduce el JS enviado al cliente |
| Estilos | **Tailwind CSS 3** | Utilidades atómicas → consistencia en el design system de auditoría; fácil de documentar |
| Mapas | **Mapbox GL JS** | Renderizado WebGL, soporte de capas de calor y clustering para el Score de Urgencia; alternativa OSS: `react-map-gl` con Mapbox |
| Animaciones | **GSAP 3 + @gsap/react** | `useGSAP()` integra limpieza automática en el ciclo de vida de React; indispensable para tablas de datos sin layout thrashing |
| Estado global | **Zustand** | Minimal API, sin boilerplate; ideal para sesiones de administrador y filtros del inventario |
| Fetching / caché | **TanStack Query (React Query)** | Cache-first, invalidación granular por módulo; integra bien con tokens JWT rotantes |
| Validación de formularios | **React Hook Form + Zod** | Validación tipada, sin re-renders innecesarios |
| Generación de QR | **qrcode.react** | Liviano, basado en SVG |
| Testing | **Vitest + Testing Library + Playwright** | Unitario + E2E para auditoría |

### Por qué Mapbox sobre Leaflet
Leaflet usa el DOM para cada marcador → degrada en datasets grandes. Mapbox GL JS utiliza WebGL, permitiendo renderizar miles de puntos de urgencia sin pérdida de FPS. Para el Portal de Transparencia (público, sin API key expuesta), se puede usar **MapLibre GL JS** (fork open-source de Mapbox) con tiles propios.

---

## 2. Estructura de Carpetas

```
tlapiani-dashboard/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Route group — autenticado (JWT)
│   │   ├── layout.tsx            # Shell: sidebar, header, AuthGuard
│   │   ├── inventario/           # RF-2.1
│   │   │   ├── page.tsx
│   │   │   └── [loteId]/
│   │   │       └── page.tsx
│   │   ├── mapa/                 # RF-2.2
│   │   │   └── page.tsx
│   │   └── despacho/             # RF-2.3
│   │       ├── page.tsx
│   │       └── [despachoId]/
│   │           └── qr/
│   │               └── page.tsx
│   └── (public)/                 # Route group — sin auth
│       └── transparencia/        # RF-2.4
│           ├── page.tsx
│           └── lote/[id]/
│               └── page.tsx
│
├── modules/                      # Lógica de negocio encapsulada por módulo
│   ├── inventario/
│   │   ├── components/           # InventarioTable, LoteCard, FiltrosBar
│   │   ├── hooks/                # useInventario.ts, useLoteDetail.ts
│   │   ├── services/             # inventario.api.ts  (calls → /api/v1/inventario)
│   │   └── types/                # lote.types.ts
│   ├── mapa/
│   │   ├── components/           # MapaPrioridad, UrgenciaLayer, LeyendaPanel
│   │   ├── hooks/                # useMapaUrgencia.ts
│   │   ├── services/             # mapa.api.ts
│   │   └── types/                # urgencia.types.ts
│   ├── despacho/
│   │   ├── components/           # DespachoForm, QRViewer, EstadoTracker
│   │   ├── hooks/                # useDespacho.ts, useQR.ts
│   │   ├── services/             # despacho.api.ts
│   │   └── types/                # despacho.types.ts
│   └── transparencia/
│       ├── components/           # TimelinePublica, LotePublicoCard, AuditoriaLog
│       ├── hooks/                # useTransparencia.ts
│       ├── services/             # transparencia.api.ts
│       └── types/                # auditoria.types.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts             # Axios instance con interceptores JWT
│   │   └── refresh.ts            # Lógica de token rotation
│   ├── auth/
│   │   ├── session.ts            # Gestión de sesión (ver sección 4)
│   │   └── guards.tsx            # AuthGuard, RoleGuard
│   └── gsap/
│       └── animations.ts         # Timelines reutilizables (ver sección 3)
│
├── components/                   # Componentes UI compartidos
│   ├── ui/                       # Primitivos: Button, Badge, Modal, Tooltip
│   ├── data-display/             # DataTable, StatCard, AuditoriaTimeline
│   └── feedback/                 # LoadingSkeleton, EmptyState, ErrorBoundary
│
├── store/                        # Zustand stores
│   ├── auth.store.ts
│   ├── inventario.store.ts
│   └── ui.store.ts
│
└── middleware.ts                 # Next.js middleware → protección de rutas (admin)
```

### Principio de encapsulación por módulo
Cada módulo en `modules/` es **autónomo**: sus componentes solo importan de `components/ui` y `lib/`. Esto permite documentar cada RF de forma independiente en el artículo IEEE y facilita pruebas aisladas.

---

## 3. GSAP — Manejo de Estados UI sin Layout Thrashing

### El problema en tablas de datos grandes
Una tabla de inventario con cientos de lotes que actualiza filas en respuesta a cambios de estado (en tránsito → entregado) puede causar layout thrashing si se leen y escriben propiedades del DOM de forma intercalada.

### Regla de oro: leer todo, luego escribir todo
GSAP hace esto internamente, pero cuando se mezcla lógica de React con GSAP hay que respetar el mismo patrón.

### Patrón recomendado: `useGSAP` con `scope` + `stagger`

```tsx
// modules/inventario/components/InventarioTable.tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export function InventarioTable({ lotes }: { lotes: Lote[] }) {
  const tableRef = useRef<HTMLTableSectionElement>(null);

  // ✅ useGSAP: cleanup automático al desmontar / re-render
  useGSAP(() => {
    // Animación de entrada: stagger en lugar de N tweens separados
    gsap.from(".lote-row", {
      opacity: 0,
      y: 12,
      duration: 0.35,
      stagger: 0.04,          // más eficiente que un tween por fila
      ease: "power2.out",
      // ✅ Solo opacity + y (transform) — nunca height/top
    });
  }, { scope: tableRef });   // scope limita los selectores a este componente

  return (
    <tbody ref={tableRef}>
      {lotes.map((lote) => (
        <tr key={lote.id} className="lote-row">
          {/* celdas */}
        </tr>
      ))}
    </tbody>
  );
}
```

### Animación de cambio de estado (ej. "en tránsito → entregado")

```tsx
// lib/gsap/animations.ts
import gsap from "gsap";

/**
 * Anima el badge de estado de un lote sin leer/escribir el DOM en el mismo frame.
 * Usa transforms + opacity exclusivamente para mantenerse en el compositor.
 */
export function animateBadgeTransicion(badgeEl: Element) {
  const tl = gsap.timeline();
  tl.to(badgeEl, { opacity: 0, scale: 0.85, duration: 0.18, ease: "power1.in" })
    .set(badgeEl, { /* React actualiza el texto aquí vía setState */ })
    .to(badgeEl, { opacity: 1, scale: 1, duration: 0.22, ease: "back.out(1.4)" });
  return tl;
}
```

### Loading skeleton con `quickTo` para indicadores de progreso

```tsx
// components/feedback/LoadingSkeleton.tsx
import { useRef, useEffect } from "react";
import gsap from "gsap";

export function ProgressBar({ value }: { value: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  const xTo = useRef<ReturnType<typeof gsap.quickTo>>();

  useEffect(() => {
    if (!barRef.current) return;
    // quickTo reutiliza un único tween — ideal para valores que cambian frecuentemente
    xTo.current = gsap.quickTo(barRef.current, "scaleX", {
      duration: 0.4,
      ease: "power3.out",
    });
  }, []);

  useEffect(() => {
    xTo.current?.(value / 100); // valor normalizado 0–1 para scaleX
  }, [value]);

  return (
    <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
      <div
        ref={barRef}
        className="h-full bg-emerald-500 origin-left"
        style={{ scaleX: 0, willChange: "transform" }}
      />
    </div>
  );
}
```

### Checklist de performance GSAP para Tlapiani

- ✅ Animar solo `x`, `y`, `opacity`, `scale` — nunca `width`, `height`, `top`, `left`
- ✅ `useGSAP({ scope: ref })` en cada componente — cleanup automático, selectores aislados
- ✅ `stagger` para listas de lotes en lugar de N tweens individuales
- ✅ `gsap.quickTo()` para barras de progreso y valores actualizados frecuentemente
- ✅ `will-change: transform` solo en elementos que realmente animan
- ✅ Matar animaciones en componentes no visibles (ej. tabs inactivos)
- ❌ No crear timelines dentro de loops de render
- ❌ No usar callbacks de GSAP sin `contextSafe` para evitar leaks en React

---

## 4. Seguridad — Consumo de API FastAPI con JWT

### Arquitectura de sesión

```
Browser                  Next.js Server         FastAPI Backend
   │                          │                       │
   │── POST /api/auth/login ──▶│                       │
   │                          │── POST /auth/token ───▶│
   │                          │◀── { access, refresh }─│
   │                          │                       │
   │◀── Set-Cookie: session ──│  (HttpOnly, Secure,   │
   │    (encripta tokens)     │   SameSite=Strict)    │
   │                          │                       │
   │── GET /admin/inventario ─▶│                       │
   │                          │── GET /inventario ────▶│  (Bearer access_token)
   │◀── HTML/JSON ────────────│◀── 200 OK ─────────── │
```

**Principio clave:** el `access_token` y el `refresh_token` **nunca tocan el localStorage ni el cliente directamente**. Viven en una cookie HttpOnly gestionada por el servidor de Next.js.

### Implementación

#### `lib/auth/session.ts` — gestión server-side

```ts
// Solo se ejecuta en el servidor (Next.js Route Handler / Server Action)
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function setSession(accessToken: string, refreshToken: string) {
  const encrypted = await new SignJWT({ accessToken, refreshToken })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SESSION_SECRET);

  cookies().set("tlapiani_session", encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });
}

export async function getSession() {
  const cookie = cookies().get("tlapiani_session");
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie.value, SESSION_SECRET);
    return payload as { accessToken: string; refreshToken: string };
  } catch {
    return null;
  }
}
```

#### `lib/api/client.ts` — Axios con interceptor de refresh

```ts
// Este cliente se usa en Server Components y Route Handlers, nunca en el browser directamente
import axios from "axios";
import { getSession, setSession } from "@/lib/auth/session";

export const apiClient = axios.create({
  baseURL: process.env.FASTAPI_BASE_URL,
  timeout: 10_000,
});

apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const session = await getSession();
      if (!session) throw error;

      // Intentar refresh
      const { data } = await axios.post(
        `${process.env.FASTAPI_BASE_URL}/auth/refresh`,
        { refresh_token: session.refreshToken }
      );
      await setSession(data.access_token, data.refresh_token);

      // Reintentar la petición original
      error.config.headers.Authorization = `Bearer ${data.access_token}`;
      return axios(error.config);
    }
    throw error;
  }
);
```

#### `middleware.ts` — Protección de rutas admin

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

const PROTECTED = /^\/(admin)/;

export async function middleware(req: NextRequest) {
  if (PROTECTED.test(req.nextUrl.pathname)) {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/(admin)/:path*"] };
```

### Resumen de decisiones de seguridad

| Riesgo | Mitigación |
|---|---|
| XSS roba tokens | Tokens en HttpOnly cookie — inaccesibles desde JS |
| CSRF | `SameSite=Strict` + validación de `Origin` en FastAPI |
| Token expirado | Interceptor de refresh transparente en el servidor |
| Rutas admin expuestas | `middleware.ts` protege toda la ruta `/(admin)` |
| Secretos en el cliente | `SESSION_SECRET` y `FASTAPI_BASE_URL` solo en variables de entorno de servidor |

---

## 5. Orientación a Auditoría (Portal de Transparencia RF-2.4)

El Portal de Transparencia es un **route group público** `(public)/transparencia` que consume endpoints de solo lectura del backend. Cada acción relevante del administrador (despacho aprobado, lote modificado, QR generado) debe producir un evento de auditoría en FastAPI que el portal expone como timeline pública.

Recomendación de estructura del componente de auditoría:

```tsx
// modules/transparencia/components/AuditoriaTimeline.tsx
// Server Component — sin JS en el cliente, máxima performance y SEO
export async function AuditoriaTimeline({ loteId }: { loteId: string }) {
  const eventos = await transparenciaService.getEventos(loteId); // fetch directo server-side

  return (
    <ol className="relative border-l border-neutral-200">
      {eventos.map((ev) => (
        <li key={ev.id} className="ml-4 mb-6">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-emerald-500" />
          <time className="text-xs text-neutral-500">{ev.timestamp}</time>
          <p className="text-sm font-medium">{ev.descripcion}</p>
          <p className="text-xs text-neutral-400">por: {ev.actor}</p>
        </li>
      ))}
    </ol>
  );
}
```

---

## Referencias para el Artículo IEEE

- Next.js App Router: https://nextjs.org/docs/app
- GSAP React Integration: https://gsap.com/resources/React
- GSAP Performance: skills `gsap-performance`, `gsap-react` (instalados en el proyecto)
- Mapbox GL JS: https://docs.mapbox.com/mapbox-gl-js/
- MapLibre GL (alternativa OSS): https://maplibre.org/
- JWT en Next.js: https://nextjs.org/docs/app/building-your-application/authentication
- TanStack Query: https://tanstack.com/query
