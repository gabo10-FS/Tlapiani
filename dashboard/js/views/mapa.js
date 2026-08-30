/* ============================================================
   Vista admin: Mapa de Prioridad (Leaflet)
   - Tiles según tema (claro/oscuro) vía mapCommon.
   - Popup con botón "Asignar lote".
   Nota: el botón de "centros de acopio cercanos" y la galería por
   comunidad se quitaron de aquí — dependían de api.centrosGeo()/
   api.galeria(), que son mocks sin endpoint real todavía (ver
   js/api.js). Cuando el backend los soporte, se pueden reactivar.
   ============================================================ */

import { api } from '../api.js';
import { esc, scoreBadge, openDialog, closeDialog } from './ui.js';
import { buildPriorityMap, colorFor } from '../mapCommon.js';
import { runViewAnimations, enterPanel, enterStagger, refreshScroll } from '../animations.js';

export async function mountMapa(root) {
  root.innerHTML = `
    <div class="grid-map">
      <section class="card" style="padding:16px" id="map-card">
        <div class="section-head">
          <h3>Comunidades vulnerables</h3>
          <span class="badge badge--blue" id="map-count">—</span>
        </div>
        <div id="map"><div class="map-skeleton">Cargando mapa…</div></div>
      </section>

      <aside class="card" id="legend-card">
        <div class="section-head"><h3>Leyenda</h3></div>
        <div class="legend-list">
          <div class="legend-row"><span class="dot dot--crimson"></span> <strong>Crítica</strong> · 80–100</div>
          <div class="legend-row"><span class="dot dot--amber"></span> <strong>Alta / Media</strong> · 50–79</div>
          <div class="legend-row"><span class="dot dot--emerald"></span> <strong>Segura</strong> · &lt; 50</div>
        </div>
        <div class="nav-divider"></div>
        <div id="side-panel">
          <h4 style="font-size:14px;margin-bottom:10px">Prioridad más alta</h4>
          <div id="top-list" class="legend-list"></div>
        </div>
      </aside>
    </div>`;

  const comunidades = await api.comunidadesPrioridad();
  document.getElementById('map-count').textContent = `${comunidades.length} comunidades`;

  renderTopList(comunidades);

  runViewAnimations(root, () => {
    enterPanel('#map-card');
    enterPanel('#legend-card', { delay: 0.1 });
    enterStagger('#top-list .legend-row', { delay: 0.25, stagger: 0.05 });
  });

  try {
    await buildPriorityMap(document.getElementById('map'), comunidades, {
      popupButton: 'Asignar lote aquí →',
      onButton: (c) => asignarLote(c),
    });
    refreshScroll();
  } catch (err) {
    document.getElementById('map').innerHTML =
      `<div class="map-skeleton">No se pudo cargar el mapa.<br>Revisa tu conexión.</div>`;
    console.error(err);
  }

  function renderTopList(rows) {
    document.getElementById('top-list').innerHTML = rows.slice(0, 5).map(c => {
      const b = scoreBadge(c.score);
      return `<div class="legend-row" style="justify-content:space-between">
        <span>${esc(c.nombre)}</span><span class="badge badge--${b.cls}">${c.score}</span></div>`;
    }).join('');
  }

  function asignarLote(c) {
    openDialog(`
      <div class="dialog__header"><span class="brand-mark">◉</span>
        <div><h2>Asignar lote</h2><p class="text-muted">${esc(c.nombre)} · ${esc(c.estado)}</p></div></div>
      <p class="text-muted text-sm">Score de urgencia <strong style="color:${colorFor(c.score)}">${c.score}</strong>.
      Continúa al módulo de despacho.</p>
      <div class="dialog__footer">
        <button class="btn btn--ghost" data-close>Cancelar</button>
        <a class="btn btn--emerald" href="#/despacho" data-close>Continuar al despacho →</a>
      </div>`);
    document.querySelectorAll('#app-dialog [data-close]').forEach(b => b.addEventListener('click', closeDialog));
  }
}
