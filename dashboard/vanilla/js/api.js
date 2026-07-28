/* ============================================================
   js/api.js — Capa de acceso a la API
   - Wrapper fetch con header Authorization: Bearer <JWT>
   - Interceptor: 401 / token expirado -> redirige a login
   - Token en sessionStorage
   - MODO DEMO: si no hay backend real, resuelve contra datos mock.
   ============================================================ */

import {
  COMUNIDADES, CENTROS_ACOPIO, TIPOS_BIEN, LOTES, CUSTODIA, DEMO_USER,
  CENTROS_GEO, GALERIA, HISTORIAS, NOTICIAS,
} from './mock/data.js';

const TOKEN_KEY = 'tlapiani_jwt';
const USER_KEY = 'tlapiani_user';

/* En un backend real, apunta a la URL base. En demo queda vacío. */
export const API_BASE = '';           // ej: 'https://api.tlapiani.mx'
export const DEMO_MODE = true;         // ← cambia a false al conectar backend real

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

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    forceLogout('token_expired');
    throw new Error('No autorizado (401). Sesión expirada.');
  }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/* ---------------- Helpers demo ---------------- */
const delay = (ms = 260) => new Promise(r => setTimeout(r, ms));
let lotesDB = [...LOTES];
// Copia mutable de la galería (para subir imágenes en modo demo)
const galeriaDB = JSON.parse(JSON.stringify(GALERIA));

async function makeToken(payload) {
  // "JWT" simulado (header.payload.firma) — NO criptográficamente seguro; solo demo de flujo.
  const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=/g, '');
  const header = enc({ alg: 'HS256', typ: 'JWT' });
  const claims = enc({ ...payload, exp: Date.now() + 1000 * 60 * 60 });
  const sig = await sha256(`${header}.${claims}`);
  return `${header}.${claims}.${sig.slice(0, 24)}`;
}

/* SHA-256 real vía Web Crypto (se reutiliza para el hash de lotes) */
export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ============================================================
   API pública consumida por las vistas
   ============================================================ */
export const api = {
  /* --- Auth --- */
  async login(usuario, password) {
    if (DEMO_MODE) {
      await delay();
      if (usuario === DEMO_USER.usuario && password === DEMO_USER.password) {
        const user = { nombre: DEMO_USER.nombre, rol: DEMO_USER.rol, usuario };
        const token = await makeToken({ sub: usuario, rol: user.rol });
        auth.set(token, user);
        return { token, user };
      }
      throw new Error('Credenciales inválidas');
    }
    const data = await request('/api/v1/auth/login', { method: 'POST', body: { usuario, password }, auth: false });
    auth.set(data.token, data.user);
    return data;
  },

  logout() { auth.clear(); },

  /* --- Catálogos --- */
  async comunidades() {
    if (DEMO_MODE) { await delay(120); return [...COMUNIDADES]; }
    return request('/api/v1/comunidades');
  },
  async comunidadesPrioridad() {
    if (DEMO_MODE) { await delay(200); return [...COMUNIDADES].sort((a, b) => b.score - a.score); }
    return request('/api/v1/comunidades/prioridad');
  },
  async centrosAcopio() {
    if (DEMO_MODE) { await delay(80); return [...CENTROS_ACOPIO]; }
    return request('/api/v1/centros-acopio');
  },
  async tiposBien() {
    if (DEMO_MODE) { await delay(80); return [...TIPOS_BIEN]; }
    return request('/api/v1/tipos-bien');
  },

  /* --- Inventario --- */
  async lotes() {
    if (DEMO_MODE) { await delay(180); return [...lotesDB]; }
    return request('/api/v1/lotes');
  },
  async crearLote(payload) {
    if (DEMO_MODE) {
      await delay(300);
      const id = `TLAP-2026-${Math.floor(1000 + Math.random() * 8999)}`;
      const hash = await sha256(`${id}|${payload.tipo}|${payload.cantidad}|${Date.now()}`);
      const nuevo = { id, estado: 'Registrado', fecha: new Date().toISOString().slice(0, 10), hash, ...payload };
      lotesDB = [nuevo, ...lotesDB];
      return nuevo;
    }
    return request('/api/v1/lotes', { method: 'POST', body: payload });
  },

  /* --- Despacho --- */
  async despachar(loteId, transportista) {
    if (DEMO_MODE) {
      await delay(260);
      const lote = lotesDB.find(l => l.id === loteId) || { id: loteId };
      const hash = await sha256(`${loteId}|despacho|${transportista}|${Date.now()}`);
      if (lote) lote.estado = 'En Ruta';
      return { loteId, transportista, hash, despachadoEn: new Date().toISOString() };
    }
    return request(`/api/v1/lotes/${loteId}/despacho`, { method: 'POST', body: { transportista } });
  },

  /* --- Centros de acopio con coordenadas --- */
  async centrosGeo() {
    if (DEMO_MODE) { await delay(100); return [...CENTROS_GEO]; }
    return request('/api/v1/centros-acopio/geo', { auth: false });
  },

  /* --- Galería por comunidad (recursos del punto) --- */
  async galeria(comunidadId) {
    if (DEMO_MODE) { await delay(120); return galeriaDB[comunidadId] ? [...galeriaDB[comunidadId]] : []; }
    return request(`/api/v1/comunidades/${comunidadId}/galeria`, { auth: false });
  },
  async galeriaDestacada() {
    if (DEMO_MODE) {
      await delay(140);
      // Aplana la galería para la sección pública, con el nombre de comunidad
      const out = [];
      for (const c of COMUNIDADES) (galeriaDB[c.id] || []).forEach(g => out.push({ ...g, comunidad: c.nombre, comunidadId: c.id }));
      return out;
    }
    return request('/api/v1/galeria');
  },
  async subirImagen(comunidadId, item) {
    if (DEMO_MODE) {
      await delay(200);
      if (!galeriaDB[comunidadId]) galeriaDB[comunidadId] = [];
      galeriaDB[comunidadId].unshift({ ...item, fecha: new Date().toISOString().slice(0, 10) });
      return galeriaDB[comunidadId][0];
    }
    return request(`/api/v1/comunidades/${comunidadId}/galeria`, { method: 'POST', body: item });
  },

  /* --- Historias / casos de éxito (público) --- */
  async historias() {
    if (DEMO_MODE) { await delay(160); return [...HISTORIAS]; }
    return request('/api/v1/historias', { auth: false });
  },

  /* --- Noticias / alertas ordenadas por prioridad de la IA --- */
  async noticias() {
    if (DEMO_MODE) { await delay(160); return [...NOTICIAS].sort((a, b) => b.prioridad - a.prioridad); }
    return request('/api/v1/noticias', { auth: false });
  },

  /* --- Transparencia (público, sin JWT) --- */
  async custodia(loteId) {
    if (DEMO_MODE) {
      await delay(240);
      const historial = CUSTODIA[loteId];
      const lote = LOTES.find(l => l.id === loteId) || lotesDB.find(l => l.id === loteId);
      if (!historial && !lote) throw new Error('NOT_FOUND');
      return { lote: lote || { id: loteId }, historial: historial || [] };
    }
    return request(`/api/v1/transparencia/lotes/${loteId}`, { auth: false });
  },
};
