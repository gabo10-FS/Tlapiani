/* ============================================================
   js/app.js — Bootstrap de la SPA Tlapiani
   Tres modos de interfaz (chrome):
     · landing  → banner de bienvenida (sin nav)
     · public   → sitio público con nav simple
     · admin    → dashboard con sidebar (requiere login)
   ============================================================ */

import { api, auth, DEMO_MODE, API_BASE } from './api.js?v=redesign2';
import { router } from './router.js';
// ?v= bumpeado durante el rediseño "Bitácora Náutica": el navegador
// cacheaba estos módulos sin revalidar (http.server no manda
// Cache-Control), así que un F5 normal seguía sirviendo la versión
// vieja aunque el archivo en disco ya estuviera actualizado. Súbelo
// de nuevo si vuelves a tocar alguna de estas vistas y no ves el
// cambio reflejado.
import { mountBienvenida } from './views/bienvenida.js?v=redesign2';
import { mountPublico } from './views/publico.js?v=redesign5';
import { mountInventario } from './views/inventario.js?v=redesign4';
import { mountMapa } from './views/mapa.js?v=redesign2';
import { mountDespacho } from './views/despacho.js?v=redesign5';
import { mountTransparencia } from './views/transparencia.js?v=redesign3';
import { mountUsuarios } from './views/usuarios.js?v=redesign3';
import { mountContenido } from './views/contenido.js?v=redesign3';

/* ---------------- Refs ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const viewRoot = $('#view-root');
const viewTitle = $('#view-title');
const viewSubtitle = $('#view-subtitle');
const loginDialog = $('#login-dialog');
const sidebar = $('#sidebar');

const META = {
  '/inventario':    { title: 'Inventario', sub: 'Registro y control de bienes donados.' },
  '/prioridad':     { title: 'Mapa de Prioridad', sub: 'Comunidades vulnerables por score de urgencia.' },
  '/despacho':      { title: 'Despacho & QR', sub: 'Asignación de rutas y etiquetas de trazabilidad.' },
  '/transparencia': { title: 'Portal de Transparencia', sub: 'Consulta pública de la cadena de custodia.' },
  '/usuarios':      { title: 'Gestión de Usuarios', sub: 'Alta y listado de usuarios (solo Administrador).' },
  '/contenido':     { title: 'Contenido público', sub: 'Galería, centros de acopio, noticias e historias del sitio público.' },
};

/* Modo de chrome según ruta + sesión */
function modeFor(path) {
  if (path === '/bienvenida') return 'landing';
  if (path === '/publico') return 'public';
  if (path === '/transparencia') return auth.isAuthed() ? 'admin' : 'public';
  return 'admin'; // inventario, prioridad, despacho
}
function applyMode(mode) { document.body.setAttribute('data-mode', mode); }

/* ---------------- Tema (persistente) ---------------- */
function initTheme() {
  applyTheme(localStorage.getItem('tlapiani_theme') || 'dark');
  const toggle = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next); localStorage.setItem('tlapiani_theme', next);
  };
  $('#theme-toggle').addEventListener('click', toggle);
  $('#theme-toggle-public').addEventListener('click', toggle);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const dark = theme === 'dark';
  const label = $('[data-theme-label]'); if (label) label.textContent = dark ? '☾ Modo oscuro' : '☀ Modo claro';
  const pub = $('#theme-toggle-public'); if (pub) pub.textContent = dark ? '☾' : '☀';
}

/* ---------------- Sidebar (móvil) ---------------- */
function initSidebar() {
  $('#menu-toggle').addEventListener('click', () => sidebar.classList.toggle('is-open'));
  document.querySelectorAll('[data-nav]').forEach(a =>
    a.addEventListener('click', () => sidebar.classList.remove('is-open')));
}

/* ---------------- Nav pública ---------------- */
let pendingScroll = null;
function accessAdmin() {
  if (auth.isAuthed()) router.navigate('#/inventario');
  else openLogin();
}
function initPublicNav() {
  $('#admin-access').addEventListener('click', accessAdmin);
  // Enlaces de scroll a secciones del sitio público
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-scroll]');
    if (!a) return;
    e.preventDefault();
    const sec = a.getAttribute('data-scroll');
    if (router.current() === '/publico') scrollToSection(sec);
    else { pendingScroll = sec; router.navigate('#/publico'); }
  });
}
function scrollToSection(sec) {
  if (sec === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  document.getElementById('sec-' + sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------------- Sesión ---------------- */
function renderSession() {
  const box = $('#session-box');
  const user = auth.getUser();
  document.querySelectorAll('[data-admin-only]').forEach(a => { a.hidden = !user || user.rol !== 'Administrador'; });
  if (user) {
    box.innerHTML = `
      <div><strong>${user.nombre || user.email}</strong></div>
      <div class="text-muted text-xs">Rol: ${user.rol}</div>
      <button class="btn btn--ghost btn--sm btn--block" id="logout-btn" type="button" style="margin-top:8px">Cerrar sesión</button>`;
    $('#logout-btn').addEventListener('click', () => {
      api.logout(); renderSession(); router.navigate('#/bienvenida');
    });
  } else {
    box.innerHTML = `<button class="btn btn--emerald btn--sm btn--block" id="login-open" type="button">Iniciar sesión</button>`;
    $('#login-open').addEventListener('click', openLogin);
  }
}

/* ---------------- Login <dialog> ---------------- */
function openLogin() {
  $('#login-error').hidden = true;
  if (!loginDialog.open) loginDialog.showModal();
}
function initLogin() {
  loginDialog.querySelector('[data-close-dialog]').addEventListener('click', () => loginDialog.close());
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Verificando…';
    try {
      const fd = new FormData(form);
      await api.login(fd.get('email').trim(), fd.get('password'));
      loginDialog.close();
      renderSession();
      const target = pendingRoute || '#/inventario';
      pendingRoute = null;
      router.navigate(target);
    } catch {
      $('#login-error').hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });
}

/* ---------------- Routing ---------------- */
let pendingRoute = null;

function setAdminMeta(path) {
  const m = META[path]; if (!m) return;
  viewTitle.textContent = m.title;
  viewSubtitle.textContent = m.sub;
  document.querySelectorAll('.sidebar [data-nav]').forEach(a =>
    a.classList.toggle('is-active', a.getAttribute('href') === '#' + path));
}

function registerRoutes() {
  router.register('/bienvenida', () => mountBienvenida(viewRoot, {
    onLogin: accessAdmin,
    onVisitante: () => router.navigate('#/publico'),
  }));
  router.register('/publico', () => {
    const sec = pendingScroll; pendingScroll = null;
    return mountPublico(viewRoot, sec);
  });
  router.register('/inventario', () => mountInventario(viewRoot), { requiresAuth: true });
  router.register('/prioridad',  () => mountMapa(viewRoot),      { requiresAuth: true });
  router.register('/despacho',   () => mountDespacho(viewRoot),  { requiresAuth: true });
  router.register('/transparencia', ({ param }) => mountTransparencia(viewRoot, param)); // público
  router.register('/usuarios',   () => mountUsuarios(viewRoot),  { requiresAuth: true });
  router.register('/contenido',  () => mountContenido(viewRoot), { requiresAuth: true });

  router.setNotFound(() => {
    applyMode('public');
    viewRoot.innerHTML = `<div class="pub" style="padding-top:80px"><div class="card empty">
      <h3>Ruta no encontrada</h3><p><a href="#/bienvenida">Volver al inicio</a></p></div></div>`;
  });

  router.beforeEach(({ path, blocked }) => {
    if (blocked) { pendingRoute = '#' + path; openLogin(); router.navigate('#/bienvenida'); return; }
    applyMode(modeFor(path));
    if (modeFor(path) === 'admin') setAdminMeta(path);
  });
}

/* Interceptor 401 -> limpiar sesión y pedir login */
window.addEventListener('auth:expired', () => {
  renderSession();
  const badge = $('#net-badge'); if (badge) { badge.textContent = 'Sesión expirada'; badge.className = 'badge badge--crimson'; }
  openLogin();
});

/* ---------------- Badge de conexión ---------------- */
function initNetBadge() {
  const badge = $('#net-badge'); if (!badge) return;
  badge.textContent = DEMO_MODE ? 'Modo demo (sin backend)' : `Backend: ${API_BASE}`;
  badge.className = `badge ${DEMO_MODE ? 'badge--amber' : 'badge--emerald'}`;
}

/* ---------------- Init ---------------- */
initNetBadge();
initTheme();
initSidebar();
initPublicNav();
initLogin();
renderSession();
registerRoutes();
router.start();
