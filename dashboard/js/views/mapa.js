/* ============================================================
   Vista admin: Mapa de Prioridad (Leaflet)
   - Tiles según tema (claro/oscuro) vía mapCommon.
   - Al hacer clic en un marcador: la barra lateral muestra la
     galería de recursos de esa comunidad.
   - Botón de centros de acopio cercanos (geolocalización).
   - Popup con botón "Asignar lote".
   ============================================================ */

import { api } from '../api.js?v=redesign3';
import { esc, scoreBadge, openDialog, closeDialog, skeleton, showError } from './ui.js?v=redesign1';
import { buildPriorityMap, colorFor } from '../mapCommon.js?v=redesign10';
import { runViewAnimations, enterPanel, enterStagger, refreshScroll } from '../animations.js?v=redesign4';

export async function mountMapa(root) {
  root.innerHTML = `
    <div class="section-head" style="margin-bottom:10px">
      <h3 style="font-size:17px">Comunidades vulnerables</h3>
    </div>
    <div class="map-hero map-hero--admin" id="map-hero">
      <div id="map"><div class="map-skeleton">Cargando mapa…</div></div>
      <aside class="map-float" id="legend-card">
        <div class="map-float__bar">
          <button class="btn btn--ghost btn--sm" id="btn-cercanos">◉ Centros cercanos</button>
          <span class="badge badge--blue" id="map-count">—</span>
        </div>
        <div class="legend-list">
          <div class="legend-row"><span class="dot dot--crimson"></span> <strong>Crítica</strong> · 80–100</div>
          <div class="legend-row"><span class="dot dot--amber"></span> <strong>Alta / Media</strong> · 50–79</div>
          <div class="legend-row"><span class="dot dot--emerald"></span> <strong>Segura</strong> · &lt; 50</div>
        </div>
        <div class="nav-divider"></div>
        <div id="side-panel">
          <h4 style="font-size:13px;margin-bottom:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Prioridad más alta</h4>
          <div id="top-list" class="legend-list"></div>
        </div>
      </aside>
    </div>`;

  const [comunidades, centros] = await Promise.all([api.comunidadesPrioridad(), api.centrosGeo()]);
  document.getElementById('map-count').textContent = `${comunidades.length} comunidades`;

  renderTopList(comunidades);

  runViewAnimations(root, () => {
    enterPanel('#map-hero');
    enterStagger('#top-list .legend-row', { delay: 0.25, stagger: 0.05 });
  });

  // Galería precargada para popups / panel lateral
  const galeriaMap = {};
  await Promise.all(comunidades.map(async c => { galeriaMap[c.id] = await api.galeria(c.id); }));

  try {
    const { addCentrosCercanos } = await buildPriorityMap(document.getElementById('map'), comunidades, {
      galeria: galeriaMap,
      popupButton: 'Asignar lote aquí →',
      onSelect: (c) => renderGaleria(c),
      onButton: (c) => asignarLote(c),
    });

    document.getElementById('btn-cercanos').addEventListener('click', () => {
      if (!centros.length) { showError('Todavía no hay centros de acopio registrados. Agrega uno desde "Contenido público".'); return; }
      const badge = document.getElementById('map-count');
      badge.textContent = 'Localizando…';
      addCentrosCercanos(centros, (res) => {
        badge.textContent = `${comunidades.length} comunidades`;
        if (res.error) { showError(res.error); return; }
      });
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

  async function renderGaleria(c) {
    const panel = document.getElementById('side-panel');
    panel.innerHTML = `<div class="section-head" style="margin-bottom:8px">
        <h4 style="font-size:14px">Galería · ${esc(c.nombre)}</h4>
        <button class="btn btn--ghost btn--sm" id="back-top">↑ Prioridad</button></div>
      <div id="gal-body">${skeleton(2)}</div>`;
    document.getElementById('back-top').addEventListener('click', () => {
      panel.innerHTML = `<h4 style="font-size:14px;margin-bottom:10px">Prioridad más alta</h4><div id="top-list" class="legend-list"></div>`;
      renderTopList(comunidades);
    });
    const fotos = galeriaMap[c.id] || await api.galeria(c.id);
    const body = document.getElementById('gal-body');
    if (!fotos.length) {
      body.innerHTML = `<p class="text-muted text-sm">Aún no hay imágenes de esta comunidad. Súbelas desde <a href="#/contenido">Contenido público</a>.</p>`;
      return;
    }
    body.innerHTML = fotos.map(f => `
      <figure class="gal-item">
        <img src="${esc(f.url)}" alt="${esc(f.caption)}" loading="lazy">
        <figcaption>${esc(f.caption)}<span>${esc(f.fecha || '')}</span></figcaption>
      </figure>`).join('');
    enterStagger('#gal-body .gal-item', { stagger: 0.06 });
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
