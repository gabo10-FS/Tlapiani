/* ============================================================
   js/router.js — Router SPA por hash (#/ruta)
   - Mantiene la URL limpia con hashes.
   - Protege rutas admin: si no hay JWT, abre el login.
   - Limpia animaciones de la vista previa antes de montar la nueva.
   ============================================================ */

import { auth } from './api.js?v=redesign3';
import { cleanupView } from './animations.js?v=redesign4';
import { destroyActiveMap } from './mapCommon.js?v=redesign5';

const routes = new Map();
let notFound = null;
let onBeforeEach = null;

export const router = {
  register(path, handler, opts = {}) { routes.set(path, { handler, ...opts }); },
  setNotFound(fn) { notFound = fn; },
  beforeEach(fn) { onBeforeEach = fn; },
  navigate(hash) {
    if (location.hash === hash) resolve(); else location.hash = hash;
  },
  start() {
    window.addEventListener('hashchange', resolve);
    if (!location.hash) location.hash = '#/bienvenida';
    else resolve();
  },
  current() { return parse().path; },
};

function parse() {
  // "#/transparencia/TLAP-2026-9981" -> { path:"/transparencia", param:"TLAP-2026-9981" }
  const raw = (location.hash || '#/bienvenida').replace(/^#\/?/, '');
  const segments = raw.split('/').filter(Boolean);
  return { path: '/' + (segments[0] || 'bienvenida'), param: segments[1] || null };
}

async function resolve() {
  const { path, param } = parse();
  const route = routes.get(path) || null;

  // Limpieza de la vista anterior (mata tweens + ScrollTriggers + mapa)
  cleanupView();
  destroyActiveMap();
  // Un <dialog> abierto (ej. "Lote registrado" en inventario) es parte del
  // DOM de la vista, no de #view-root -- sobrevive al remount y queda
  // flotando encima de la vista siguiente si el usuario no lo cerró antes
  // de navegar. Ciérralo aquí, junto con el resto de la limpieza de ruta.
  document.querySelectorAll('dialog[open]').forEach(d => d.close());

  if (!route) { notFound && notFound(); return; }

  // Guard de autenticación
  if (route.requiresAuth && !auth.isAuthed()) {
    if (onBeforeEach) onBeforeEach({ path, blocked: true });
    return;
  }

  if (onBeforeEach) onBeforeEach({ path, param, route });
  try {
    await route.handler({ param });
  } catch (err) {
    console.error('[router] error al montar vista', path, err);
  }
}
