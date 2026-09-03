/* ============================================================
   Vista: Portal de Transparencia Público
   - Accesible SIN iniciar sesión (no requiere JWT).
   - Buscador por ID_Lote (ej. TLAP-2026-9981).
   - Línea de tiempo vertical de la cadena de custodia:
     Creado → En Ruta → Recibido (con estado criptográfico).
   ============================================================ */

import { api } from '../api.js?v=redesign2';
import { esc, estadoBadge, skeleton } from './ui.js?v=redesign1';
import { runViewAnimations, enterPanel, enterStagger, revealOnScroll } from '../animations.js?v=redesign3';

export async function mountTransparencia(root, preId) {
  root.innerHTML = `
    <section class="card" id="tp-hero">
      <div class="public-hero">
        <h2>Sigue la ruta de la ayuda</h2>
        <p>Ingresa el identificador del lote impreso en la etiqueta para ver su cadena de
        custodia completa, verificada criptográficamente en cada etapa.</p>
        <form id="tp-form" class="search-hero" novalidate>
          <input name="id" id="tp-input" placeholder="TLAP-2026-XXXX" required
                 pattern="TLAP-\\d{4}-\\d{3,5}" autocomplete="off" value="${esc(preId || '')}" />
          <button class="neu-btn neu-btn--emerald" type="submit">Rastrear</button>
        </form>
        <p id="tp-ejemplos" class="text-muted text-xs" style="margin-top:14px"></p>
      </div>
    </section>
    <section id="tp-result" style="margin-top:18px"></section>`;

  runViewAnimations(root, () => enterPanel('#tp-hero'));

  document.getElementById('tp-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const id = document.getElementById('tp-input').value.trim().toUpperCase();
    location.hash = `#/transparencia/${id}`;
  });

  // Los IDs de ejemplo antes venían hardcodeados y no existían en el
  // backend real (siempre daban "lote no encontrado"). Ahora se toman de
  // los lotes reales que esta sesión ya creó/despachó; si no hay ninguno,
  // simplemente no se muestra la línea de ejemplos.
  cargarEjemplos();
  async function cargarEjemplos() {
    const p = document.getElementById('tp-ejemplos');
    if (!p) return;
    try {
      const lotes = await api.lotes();
      const ids = lotes.slice(0, 3).map(l => l.id);
      if (ids.length) {
        p.innerHTML = `Ejemplos: ${ids.map(id => `<a href="#/transparencia/${id}" class="hash">${esc(id)}</a>`).join(' · ')}`;
      }
    } catch { /* sin ejemplos si falla, no es crítico */ }
  }

  if (preId) await buscar(preId.toUpperCase());

  async function buscar(id) {
    const out = document.getElementById('tp-result');
    out.innerHTML = `<div class="card">${skeleton(4)}</div>`;
    try {
      const { lote, historial } = await api.custodia(id);
      renderResultado(out, lote, historial);
    } catch (err) {
      out.innerHTML = `<div class="card empty">
        <h3>Lote no encontrado</h3>
        <p>No existe registro para <span class="hash">${esc(id)}</span>. Verifica el identificador.</p></div>`;
    }
  }
}

function renderResultado(out, lote, historial) {
  const hasAlerta = historial.some(h => h.estado === 'alerta');
  const dotClass = (estado) => estado === 'ok' ? 'tl-dot--emerald'
    : estado === 'alerta' ? 'tl-dot--crimson' : 'tl-dot--blue';
  const icon = (estado) => estado === 'ok' ? '✓' : estado === 'alerta' ? '!' : '•';

  out.innerHTML = `
    <div class="grid-2">
      <div class="card" id="tp-passport">
        <div class="section-head">
          <h3>Pasaporte digital</h3>
          <span class="badge badge--${hasAlerta ? 'crimson' : 'emerald'}">
            ${hasAlerta ? '⚠ Manipulación detectada' : '✓ Cadena íntegra'}
          </span>
        </div>
        <div class="legend-list">
          <div class="legend-row"><span class="text-muted">ID Lote</span><strong style="margin-left:auto" class="hash">${esc(lote.id)}</strong></div>
          <div class="legend-row"><span class="text-muted">Contenido</span><strong style="margin-left:auto">${esc(lote.tipo || '—')}</strong></div>
          <div class="legend-row"><span class="text-muted">Cantidad</span><strong style="margin-left:auto">${lote.cantidad ? Number(lote.cantidad).toLocaleString('es-MX') + ' ' + esc(lote.unidad || '') : '—'}</strong></div>
          <div class="legend-row"><span class="text-muted">Destino</span><strong style="margin-left:auto">${esc(lote.comunidad || '—')}</strong></div>
          <div class="legend-row"><span class="text-muted">Estado actual</span><span class="badge badge--${estadoBadge(lote.estado || 'Registrado')}" style="margin-left:auto">${esc(lote.estado || '—')}</span></div>
        </div>
      </div>

      <div class="card" id="tp-timeline-card">
        <div class="section-head"><h3>Cadena de custodia</h3></div>
        ${historial.length ? `<div class="timeline">
          ${historial.map(h => `
            <div class="tl-item">
              <span class="tl-dot ${dotClass(h.estado)}">${icon(h.estado)}</span>
              <div class="tl-title">${esc(h.etapa)}</div>
              <div class="tl-meta">${esc(h.fecha)} · ${esc(h.lugar)}</div>
              <div class="tl-meta" style="margin-top:4px">${esc(h.detalle)}</div>
              ${h.hash ? `<div class="hash" style="margin-top:6px">${esc(h.hash)}</div>` : ''}
            </div>`).join('')}
        </div>` : `<div class="empty">Sin eventos de custodia registrados aún.</div>`}
      </div>
    </div>`;

  runViewAnimations(out.closest('.view-root') || out, () => {
    enterPanel('#tp-passport');
    enterPanel('#tp-timeline-card', { delay: 0.08 });
    enterStagger('#tp-timeline-card .tl-item', { delay: 0.2, stagger: 0.08 });
  });
}
