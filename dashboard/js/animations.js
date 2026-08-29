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

import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js';
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/ScrollTrigger.js';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

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
}

/** Revierte la vista actual: mata tweens y ScrollTriggers asociados. */
export function cleanupView() {
  if (currentCtx) { currentCtx.revert(); currentCtx = null; }
  // Seguridad extra: elimina ScrollTriggers huérfanos entre vistas SPA.
  ScrollTrigger.getAll().forEach(t => t.kill());
}

/* ---------- Presets reutilizables (solo transform + autoAlpha) ---------- */

/** Entrada escalonada de tarjetas/filas. */
export function enterStagger(selector, opts = {}) {
  if (reduced) { gsap.set(selector, { autoAlpha: 1, clearProps: 'transform' }); return; }
  return gsap.from(selector, {
    y: 16, autoAlpha: 0, duration: 0.5, ease: 'power2.out',
    stagger: opts.stagger ?? 0.06, delay: opts.delay ?? 0, ...opts,
  });
}

/** Aparición simple de un panel. */
export function enterPanel(selector, opts = {}) {
  if (reduced) { gsap.set(selector, { autoAlpha: 1 }); return; }
  return gsap.from(selector, { y: 20, autoAlpha: 0, duration: 0.55, ease: 'power3.out', ...opts });
}

/**
 * Revela filas de tabla ligadas al scroll (ScrollTrigger).
 * Usa batch para no crear un trigger por fila.
 */
export function revealOnScroll(selector, scroller) {
  if (reduced) { gsap.set(selector, { autoAlpha: 1 }); return; }
  ScrollTrigger.batch(selector, {
    scroller: scroller || window,
    start: 'top 92%',
    onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out', stagger: 0.05, overwrite: true }),
    once: true,
  });
  gsap.set(selector, { y: 18, autoAlpha: 0 });
}

/** Refresca ScrollTrigger tras cambios de layout (mapa, tablas async). */
export function refreshScroll() { ScrollTrigger.refresh(); }
