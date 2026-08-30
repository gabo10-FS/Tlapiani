/* ============================================================
   js/api.js — Capa de acceso a la API
   - Wrapper fetch con header Authorization: Bearer <JWT>
   - Interceptor: 401 / token expirado -> redirige a login
   - Token en sessionStorage

   MODO DE CONEXIÓN
   -----------------
   API_BASE + DEMO_MODE=false conectan contra el backend real
   (FastAPI, ver ../backend/README.md). El contrato real SOLO
   cubre estos endpoints:
     POST /api/v1/auth/login
     POST /api/v1/usuarios/registrar   · GET /api/v1/usuarios      (Administrador)
     GET  /api/v1/comunidades/prioridad
     POST /api/v1/donaciones/registrar
     POST /api/v1/donaciones/{lote_id}/despachar
     GET  /api/v1/donaciones/historial/{lote_id}   (público)

   El backend NO expone (todavía): listado general de lotes,
   catálogo de comunidades sin auth, centros de acopio, galería,
   historias ni noticias. `lotes()`/`comunidades()`/`centrosAcopio()`/
   `tiposBien()` siguen en modo simulado (mock/data.js) aunque
   DEMO_MODE=false porque son insumos de pantallas que sí funcionan
   de verdad (Inventario, Despacho) — no se inventa el endpoint que
   falta, se documenta aquí función por función. `galeria()`,
   `subirImagen()`, `historias()`, `noticias()` y `centrosGeo()` YA
   NO se usan desde ninguna vista (esas secciones se ocultaron del
   dashboard en vez de mostrar contenido inventado) — quedan aquí
   solo por si se reactivan cuando el backend las soporte.
   ============================================================ */

import {
  COMUNIDADES, CENTROS_ACOPIO, TIPOS_BIEN, LOTES,
  CENTROS_GEO, GALERIA, HISTORIAS, NOTICIAS,
} from './mock/data.js';

const TOKEN_KEY = 'tlapiani_jwt';
const USER_KEY = 'tlapiani_user';

export const API_BASE = 'http://127.0.0.1:8000';
export const DEMO_MODE = false;        // ← false: usa el backend real donde el contrato existe

/* ---------------- Sesión / JWT ---------------- */
export const auth = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  getUser: () => { try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch { return null; } },
  isAuthed: () => !!sessionStorage.getItem(TOKEN_KEY),
  set(token, user) {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

/* Evento global para que el router reaccione a un 401 */
function forceLogout(reason) {
  auth.clear();
  window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason } }));
}

/* ---------------- Fetch con interceptor ---------------- */
async function request(path, { method = 'GET', body, auth: needsAuth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth.getToken();
  if (needsAuth && token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${API_BASE}. ¿Está corriendo uvicorn?`);
  }

  if (res.status === 401) {
    forceLogout('token_expired');
    throw new Error('No autorizado (401). Sesión expirada.');
  }
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try { const j = await res.json(); if (j.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail); } catch { /* noop */ }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

/* ---------------- Helpers demo ---------------- */
const delay = (ms = 260) => new Promise(r => setTimeout(r, ms));
let lotesDB = [...LOTES];
// Copia mutable de la galería (para subir imágenes en modo demo)
const galeriaDB = JSON.parse(JSON.stringify(GALERIA));

/* SHA-256 real vía Web Crypto (se usa en algunas vistas para armar el JSON del QR) */
export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------------- Adaptadores backend real -> forma interna de las vistas ---------------- */

// ComunidadPrioridadResponse -> forma { id, nombre, estado, score, lat, lng, poblacion, alerta_activa }
// que ya consumen mapa.js / mapCommon.js / inventario.js.
function adaptComunidad(c) {
  return {
    id: c.comunidad_id,
    nombre: c.nombre,
    estado: c.estado,
    score: Math.round(Number(c.score_urgencia)),
    clasificacion: c.clasificacion,
    lat: Number(c.coordenadas.lat),
    lng: Number(c.coordenadas.lng),
    poblacion: null, // el backend real no expone población todavía
    alerta_activa: c.alerta_activa,
  };
}

// RegistroLoteResponse -> forma { id, tipo, cantidad, unidad, comunidad, comunidadId, origen, estado, fecha, hash }
function adaptLoteRegistrado(res, body, comunidadNombre) {
  return {
    id: res.lote_id,
    tipo: body.tipo_bien,
    cantidad: Number(body.cantidad_kg),
    unidad: 'kg',
    comunidad: comunidadNombre,
    comunidadId: body.comunidad_destino_id,
    origen: body.origen_acopio,
    estado: res.status,
    fecha: String(res.timestamp_creacion).slice(0, 10),
    hash: res.hash_sha256,
  };
}

// HistorialLoteResponse -> forma { lote: {...}, historial: [{etapa, estado, fecha, lugar, detalle, hash}] }
function adaptHistorial(h) {
  const dotFor = (estado) => {
    if (estado === 'Alerta de Manipulación') return 'alerta';
    if (estado === 'En Ruta') return 'blue';
    return 'ok';
  };
  return {
    lote: {
      id: h.lote_id,
      tipo: h.tipo_bien,
      cantidad: Number(h.cantidad_kg),
      unidad: 'kg',
      comunidad: h.comunidad_destino,
      origen: h.origen_acopio,
      estado: h.estado_actual,
    },
    historial: h.bitacora_movimientos.map(m => ({
      etapa: m.estado,
      estado: dotFor(m.estado),
      fecha: new Date(m.timestamp).toLocaleString('es-MX'),
      lugar: '',
      detalle: m.detalle,
      hash: m.estado === 'Creado' ? h.hash_origen : '',
    })),
  };
}

/* ============================================================
   API pública consumida por las vistas
   ============================================================ */
export const api = {
  /* --- Auth (real) --- */
  async login(email, password) {
    const data = await request('/api/v1/auth/login', { method: 'POST', body: { email, password }, auth: false });
    // El backend no devuelve nombre_completo en el login; usamos el correo como identidad visible.
    const user = { email, rol: data.rol };
    auth.set(data.access_token, user);
    return { token: data.access_token, user };
  },

  logout() { auth.clear(); },

  /* --- Usuarios (real, RF-2.1, solo Administrador) --- */
  async usuarios() {
    return request('/api/v1/usuarios');
  },
  async crearUsuario(payload) {
    // payload: { nombre_completo, email, password, rol }
    return request('/api/v1/usuarios/registrar', { method: 'POST', body: payload });
  },

  /* --- Catálogos (mock — sin endpoint público en el backend real) --- */
  async comunidades() {
    await delay(120); return [...COMUNIDADES];
  },
  /* Comunidades + score de urgencia (real) — también sirve como catálogo
     de comunidades con id numérico real para el formulario de Inventario. */
  async comunidadesPrioridad() {
    const rows = await request('/api/v1/comunidades/prioridad');
    return rows.map(adaptComunidad).sort((a, b) => b.score - a.score);
  },
  async centrosAcopio() {
    // El backend real solo guarda `origen_acopio` como texto libre (no hay catálogo).
    await delay(80); return [...CENTROS_ACOPIO];
  },
  async tiposBien() {
    // Igual: `tipo_bien` es texto libre en el backend real; el datalist es solo UX.
    await delay(80); return [...TIPOS_BIEN];
  },

  /* --- Inventario (real: crear; sin endpoint de listado -> caché de sesión) --- */
  async lotes() {
    // No existe GET /api/v1/donaciones en el backend real: no hay forma de
    // listar todos los lotes existentes. Mantenemos un caché local que se
    // llena con los lotes creados/despachados en esta sesión del navegador.
    await delay(0); return [...lotesDB];
  },
  async crearLote(payload) {
    // payload de la vista: { tipo, cantidad, unidad, comunidad (nombre), comunidadId, origen }
    const body = {
      tipo_bien: payload.tipo,
      cantidad_kg: payload.cantidad,
      comunidad_destino_id: payload.comunidadId,
      origen_acopio: payload.origen,
    };
    const res = await request('/api/v1/donaciones/registrar', { method: 'POST', body });
    const nuevo = adaptLoteRegistrado(res, body, payload.comunidad);
    lotesDB = [nuevo, ...lotesDB];
    return nuevo;
  },

  /* --- Despacho (real) --- */
  async despachar(loteId, transportistaId, notas) {
    const res = await request(`/api/v1/donaciones/${encodeURIComponent(loteId)}/despachar`, {
      method: 'POST',
      body: { transportista_id: transportistaId, notas: notas || null },
    });
    const lote = lotesDB.find(l => l.id === loteId);
    if (lote) lote.estado = res.estado_actual;
    return {
      loteId: res.lote_id,
      estado: res.estado_actual,
      transportistaId: res.transportista_id,
      despachadoEn: res.despachado_en,
      // El hash ya fue firmado al registrar el lote (no se regenera al despachar).
      hash: lote ? lote.hash : '',
    };
  },

  /* --- Centros de acopio con coordenadas (mock — sin endpoint real) --- */
  async centrosGeo() {
    await delay(100); return [...CENTROS_GEO];
  },

  /* --- Galería por comunidad (mock — sin endpoint real) --- */
  async galeria(comunidadId) {
    await delay(120); return galeriaDB[comunidadId] ? [...galeriaDB[comunidadId]] : [];
  },
  async galeriaDestacada() {
    await delay(140);
    const out = [];
    for (const c of COMUNIDADES) (galeriaDB[c.id] || []).forEach(g => out.push({ ...g, comunidad: c.nombre, comunidadId: c.id }));
    return out;
  },
  async subirImagen(comunidadId, item) {
    await delay(200);
    if (!galeriaDB[comunidadId]) galeriaDB[comunidadId] = [];
    galeriaDB[comunidadId].unshift({ ...item, fecha: new Date().toISOString().slice(0, 10) });
    return galeriaDB[comunidadId][0];
  },

  /* --- Historias / casos de éxito (mock — sin endpoint real) --- */
  async historias() {
    await delay(160); return [...HISTORIAS];
  },

  /* --- Noticias / alertas (mock — sin endpoint real) --- */
  async noticias() {
    await delay(160); return [...NOTICIAS].sort((a, b) => b.prioridad - a.prioridad);
  },

  /* --- Transparencia (real, público, sin JWT) --- */
  async custodia(loteId) {
    try {
      const h = await request(`/api/v1/donaciones/historial/${encodeURIComponent(loteId)}`, { auth: false });
      return adaptHistorial(h);
    } catch {
      throw new Error('NOT_FOUND');
    }
  },
};
