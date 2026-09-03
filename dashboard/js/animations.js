/* ============================================================
   js/animations.js — Capa de animación (GSAP)
   Reglas del proyecto:
   - Solo se animan transform + opacity (autoAlpha).
   - Cada vista corre dentro de un gsap.context() y se revierte
     al cambiar de ruta (cleanup), matando ScrollTriggers.
   - No se anima nada que quede invisible/bloqueando clics.
   - Respeta prefers-reduced-motion vía gsap.matchMedia.
   GSAP se importa como ESM desde CDN (script type=module => defer).
   ============================================================ */

// Import dinámico (no estático) a propósito: un <script type="module">
// con un `import` estático que falla (CDN caído, sin conexión, bloqueado
// por un ad-blocker) revienta la evaluación de ESTE módulo Y de todo lo
// que lo importa -- es decir, cada vista de la app, ya que todas pasan
// por aquí. El resultado sería pantalla en blanco, no solo animaciones
// rotas. Con import() + try/catch, un CDN caído degrada a un stub que
// deja el contenido visible sin animar, en vez de tumbar la SPA entera.
let gsap, ScrollTrigger;
try {
  ({ gsap } = await import('https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js'));
  ({ ScrollTrigger } = await import('https://cdn.jsdelivr.net/npm/gsap@3.13.0/ScrollTrigger.js'));
  gsap.registerPlugin(ScrollTrigger);
} catch (err) {
  console.error(
    '[Tlapiani] GSAP no cargó desde el CDN (sin conexión o CDN caído). ' +
    'Las animaciones quedan desactivadas; el contenido se muestra directamente.', err
  );
  ({ gsap, ScrollTrigger } = gsapFallbackStub());
}
export { gsap, ScrollTrigger };

/* Stub mínimo: replica solo la superficie de la API de GSAP/ScrollTrigger
   que este proyecto realmente usa (context/set/from/to/timeline por un
   lado, batch/getAll/refresh por el otro). En vez de animar, aplica de
   inmediato el estado final visible -- mismo contrato que runViewAnimations
   ya promete para su red de seguridad (nunca dejar contenido invisible). */
function gsapFallbackStub() {
  const showFinal = (target) => {
    const els = typeof target === 'string' ? document.querySelectorAll(target)
      : (target && target.length !== undefined ? target : [target]);
    els.forEach(el => {
      if (!el?.style) return;
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
      el.style.removeProperty('transform');
    });
  };
  const stubGsap = {
    registerPlugin() {},
    context(fn) { if (fn) fn(stubGsap); return { revert() {} }; },
    set: showFinal,
    from(target) { showFinal(target); return stubGsap; },
    to(target) { showFinal(target); return stubGsap; },
    timeline() {
      const tl = {
        from(target) { showFinal(target); return tl; },
        to(target) { showFinal(target); return tl; },
      };
      return tl;
    },
  };
  const stubScrollTrigger = {
    batch(selector, vars = {}) {
      const els = Array.from(document.querySelectorAll(selector));
      if (els.length && vars.onEnter) vars.onEnter(els, []);
      return [];
    },
    getAll() { return []; },
    refresh() {},
  };
  return { gsap: stubGsap, ScrollTrigger: stubScrollTrigger };
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Contexto de la vista activa; se revierte antes de montar la siguiente. */
let currentCtx = null;

/**
 * Ejecuta las animaciones de entrada de una vista dentro de un contexto
 * con scope al root, de modo que revert() limpie tweens + ScrollTriggers.
 * @param {HTMLElement} scope  contenedor de la vista
 * @param {(ctx:object)=>void} build  callback donde se definen tweens
 */
export function runViewAnimations(scope, build) {
  cleanupView();
  currentCtx = gsap.context(() => {
    if (build) build(gsap);
  }, scope);
  // Red de seguridad: si el ticker de GSAP se queda atascado (pestaña en
  // segundo plano al montar, frame drop severo, cualquier fallo del
  // timeline a mitad de camino), el contrato de este archivo es que nada
  // quede invisible bloqueando la interacción. 2.5s cubre con margen la
  // entrada más larga del proyecto; pasado ese plazo forzamos el estado
  // final visible. DOM plano, no gsap.set(): si lo que se atascó fue el
  // propio pipeline de render de GSAP (no solo su ticker), un gsap.set()
  // puede no aplicar nada -- quitar el estilo inline a mano no depende
  // de que GSAP esté sano.
  const safety = setTimeout(() => {
    scope.querySelectorAll('[style*="opacity"], [style*="visibility"], [style*="transform"]').forEach(el => {
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
      el.style.removeProperty('transform');
    });
  }, 2500);
  const prevRevert = currentCtx.revert.bind(currentCtx);
  currentCtx.revert = (...args) => { clearTimeout(safety); return prevRevert(...args); };
}

/** Revierte la vista actual: mata tweens y ScrollTriggers asociados. */
export function cleanupView() {
  if (currentCtx) { currentCtx.revert(); currentCtx = null; }
  // Seguridad extra: elimina ScrollTriggers huérfanos entre vistas SPA.
  ScrollTrigger.getAll().forEach(t => t.kill());
  scrollBatches.clear();
}

/* ---------- Presets reutilizables (solo transform + autoAlpha) ---------- */

/* Duraciones/easing (revisión Emil Kowalski, 2026-09-02): estos tres
   presets disparan en CADA cambio de ruta -- vistos decenas de veces por
   sesión, no una vez. Con esa frecuencia la guía es "under 300ms, reduce
   drásticamente"; 450-550ms hacía que la app se sintiera lenta al navegar.
   power2.out en los tres (antes enterPanel usaba power3.out) para que el
   sistema entero se sienta como una sola familia de movimiento. */
const UI_DURATION = 0.22;
const UI_EASE = 'power2.out';

/** Entrada escalonada de tarjetas/filas. */
export function enterStagger(selector, opts = {}) {
  if (reduced) { gsap.set(selector, { autoAlpha: 1, clearProps: 'transform' }); return; }
  return gsap.from(selector, {
    y: 16, autoAlpha: 0, duration: UI_DURATION, ease: UI_EASE,
    stagger: opts.stagger ?? 0.06, delay: opts.delay ?? 0, ...opts,
  });
}

/** Aparición simple de un panel. */
export function enterPanel(selector, opts = {}) {
  if (reduced) { gsap.set(selector, { autoAlpha: 1 }); return; }
  return gsap.from(selector, { y: 20, autoAlpha: 0, duration: UI_DURATION, ease: UI_EASE, ...opts });
}

/**
 * Revela filas de tabla ligadas al scroll (ScrollTrigger).
 * Usa batch para no crear un trigger por fila.
 */
const scrollBatches = new Map();
export function revealOnScroll(selector, scroller) {
  // inventario.js/usuarios.js reemplazan el <tbody> entero en cada
  // búsqueda o alta (nuevos <tr>, los viejos ya no existen). Sin esto,
  // el batch anterior queda apuntando a nodos desmontados y las filas
  // nuevas nunca se registran -- el reveal-on-scroll se apagaba solo
  // después del primer render. Se mata el batch anterior de este mismo
  // selector antes de crear uno nuevo sobre los elementos actuales.
  scrollBatches.get(selector)?.forEach(t => t.kill());
  scrollBatches.delete(selector);
  // publico.js llama revealOnScroll('.news-card') / '.hist-card' de una vez,
  // sin condicionar a si hay noticias/historias publicadas -- con la lista
  // vacía (estado real, no un bug) el selector no matchea nada, y tanto
  // gsap.set() como ScrollTrigger.batch() avisan "target not found" en
  // consola por cada llamada. No es un error real: simplemente no hay nada
  // que revelar todavía.
  if (!document.querySelector(selector)) return;
  if (reduced) { gsap.set(selector, { autoAlpha: 1 }); return; }
  gsap.set(selector, { y: 18, autoAlpha: 0 });
  const batch = ScrollTrigger.batch(selector, {
    scroller: scroller || window,
    start: 'top 92%',
    onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, duration: UI_DURATION, ease: UI_EASE, stagger: 0.05, overwrite: true }),
    once: true,
  });
  scrollBatches.set(selector, batch);
}

/** Refresca ScrollTrigger tras cambios de layout (mapa, tablas async). */
export function refreshScroll() { ScrollTrigger.refresh(); }
