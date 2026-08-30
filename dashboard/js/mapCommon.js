/* ============================================================
   js/mapCommon.js — Utilidades de mapa compartidas (admin + público)
   - Carga Leaflet async (una sola vez).
   - Tiles según tema (oscuro: Dark Matter · claro: Positron) y
     cambio en vivo al alternar el tema  ← corrige el bug de modo claro.
   - Marcadores por score de urgencia con popup + galería.
   - Centros de acopio cercanos por geolocalización.
   ============================================================ */

import { esc, scoreBadge } from './views/ui.js';

let leafletPromise = null;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    s.crossOrigin = '';
    s.onload = () => resolve(window.L);
    s.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
    document.head.appendChild(s);
  });
  return leafletPromise;
}

export const hexFor = (score) => score >= 80 ? '#e0435a' : score >= 50 ? '#f59f0b' : '#28a95f';
export const colorFor = (score) => score >= 80 ? 'var(--accent-crimson)'
  : score >= 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)';

const TILES = {
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};
const currentTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

/* ---- Un solo observer de tema para toda la app (varios mapas pueden
   estar activos a la vez, p. ej. el mapa de estados + el de comunidades
   en la misma vista pública) ---- */
let themeSwapCallbacks = [];
let themeObserver = null;
function ensureThemeObserver() {
  if (themeObserver) return;
  themeObserver = new MutationObserver(() => {
    const theme = currentTheme();
    themeSwapCallbacks.forEach(cb => cb(theme));
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/* ---- Mapas activos (para limpiar al cambiar de vista) ---- */
let activeCleanups = [];
export function destroyActiveMap() {
  themeSwapCallbacks = [];
  activeCleanups.forEach(fn => { try { fn(); } catch {} });
  activeCleanups = [];
}

/**
 * Construye el mapa de prioridad en `mapEl`.
 * @returns {Promise<{map, L, addCentrosCercanos}>}
 */
export async function buildPriorityMap(mapEl, comunidades, opts = {}) {
  const L = await loadLeaflet();
  ensureThemeObserver();

  mapEl.innerHTML = '';
  const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: opts.scrollWheelZoom ?? true })
    .setView(opts.center || [19.4, -99.1], opts.zoom || 5);
  activeCleanups.push(() => map.remove());

  let tileLayer = L.tileLayer(TILES[currentTheme()], {
    attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);

  // Cambio de tiles al alternar el tema
  themeSwapCallbacks.push((theme) => {
    const nl = L.tileLayer(TILES[theme], { attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = nl;
  });

  // Marcadores "glow" (estilo mapa de calor) por comunidad
  comunidades.forEach(c => {
    const size = Math.round(34 + c.score * 0.7);
    const icon = L.divIcon({
      className: 'glow-marker',
      html: `<span class="glow-halo" style="--c:${hexFor(c.score)};width:${size}px;height:${size}px"></span>
             <span class="glow-core" style="--c:${hexFor(c.score)}"></span>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    });
    const marker = L.marker([c.lat, c.lng], { icon }).addTo(map);
    const b = scoreBadge(c.score);
    marker.bindPopup(`
      <div class="popup-title">${esc(c.nombre)}</div>
      <div class="popup-row"><span>Estado</span><strong>${esc(c.estado)}</strong></div>
      <div class="popup-row"><span>Población</span><strong>${c.poblacion != null ? c.poblacion.toLocaleString('es-MX') : '—'}</strong></div>
      <div class="popup-row"><span>Score de urgencia</span><strong style="color:${colorFor(c.score)}">${c.score} · ${b.label}</strong></div>
      ${opts.popupButton ? `<button class="btn btn--emerald btn--sm" style="margin-top:10px;width:100%" data-mapbtn="${esc(c.id)}">${esc(opts.popupButton)}</button>` : ''}
    `, { maxWidth: 240 });

    marker.on('click', () => opts.onSelect && opts.onSelect(c));
    if (opts.popupButton) {
      marker.on('popupopen', (e) => {
        const btn = e.popup.getElement().querySelector('[data-mapbtn]');
        btn && btn.addEventListener('click', () => opts.onButton && opts.onButton(c));
      });
    }
  });

  setTimeout(() => map.invalidateSize(), 60);

  /* Centros de acopio cercanos a la posición del usuario */
  const centroMarkers = [];
  function addCentrosCercanos(centros, onList) {
    if (!navigator.geolocation) { onList && onList({ error: 'Tu navegador no permite geolocalización.' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        centroMarkers.forEach(m => map.removeLayer(m));
        centroMarkers.length = 0;
        const you = L.marker([lat, lng]).addTo(map).bindPopup('Tu ubicación');
        centroMarkers.push(you);
        const withDist = centros.map(ce => ({ ...ce, dist: haversine(lat, lng, ce.lat, ce.lng) }))
          .sort((a, b) => a.dist - b.dist);
        withDist.slice(0, 3).forEach(ce => {
          const m = L.circleMarker([ce.lat, ce.lng], { radius: 10, color: '#3aa0ee', fillColor: '#3aa0ee', fillOpacity: .8, weight: 2 })
            .addTo(map).bindPopup(`<div class="popup-title">${esc(ce.nombre)}</div>
              <div class="popup-row"><span>Distancia</span><strong>${ce.dist.toFixed(0)} km</strong></div>
              <div class="popup-row"><span>Capacidad</span><strong>${esc(ce.capacidad)}</strong></div>`);
          centroMarkers.push(m);
        });
        const grp = L.featureGroup(centroMarkers);
        map.fitBounds(grp.getBounds().pad(0.3));
        onList && onList({ centros: withDist.slice(0, 3), lat, lng });
      },
      () => onList && onList({ error: 'No pudimos obtener tu ubicación (permiso denegado).' }),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  function clearCentros() {
    centroMarkers.forEach(m => map.removeLayer(m));
    centroMarkers.length = 0;
  }

  return { map, L, addCentrosCercanos, clearCentros };
}

/**
 * Mapa "elige tu estado" (inspirado en el buscador de delegaciones de
 * Cruz Roja Mexicana): silueta de los 32 estados, resalta los que ya
 * tienen comunidades registradas y abre un panel al hacer clic.
 * @param {HTMLElement} mapEl
 * @param {object} geojson  FeatureCollection de los 32 estados (properties.name)
 * @param {Map<string, object[]>} comunidadesPorEstado
 * @param {{ onSelect?: (nombreEstado: string, comunidades: object[]) => void }} opts
 * @returns {Promise<{map, L, layer, selectEstado}>}
 */
export async function buildStateMap(mapEl, geojson, comunidadesPorEstado, opts = {}) {
  const L = await loadLeaflet();
  mapEl.innerHTML = '';
  const map = L.map(mapEl, {
    zoomControl: false, attributionControl: false, dragging: false,
    scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, touchZoom: false,
  });
  activeCleanups.push(() => map.remove());

  // Colores como variables CSS: se adaptan solas al tema, sin redibujar.
  const withData = (name) => (comunidadesPorEstado.get(name) || []).length > 0;

  let selected = null;
  function styleFor(feature) {
    const name = feature.properties.name;
    const isSel = selected === name;
    return {
      fillColor: withData(name) ? 'var(--accent-emerald)' : 'var(--bg-tertiary)',
      fillOpacity: isSel ? 0.95 : (withData(name) ? 0.55 : 0.9),
      color: isSel ? 'var(--accent-blue)' : 'var(--bg-secondary)',
      weight: isSel ? 3 : 1.5,
    };
  }

  const layer = L.geoJSON(geojson, {
    style: styleFor,
    onEachFeature(feature, lyr) {
      const name = feature.properties.name;
      lyr.on('mouseover', () => { if (selected !== name) lyr.setStyle({ fillOpacity: 0.85 }); });
      lyr.on('mouseout', () => { if (selected !== name) lyr.setStyle(styleFor(feature)); });
      lyr.on('click', () => selectEstado(name));
      lyr.bindTooltip(name, { sticky: true, className: 'state-tooltip' });
    },
  }).addTo(map);
  map.fitBounds(layer.getBounds(), { padding: [6, 6] });

  function selectEstado(name) {
    selected = name;
    layer.eachLayer(lyr => lyr.setStyle(styleFor(lyr.feature)));
    opts.onSelect && opts.onSelect(name, comunidadesPorEstado.get(name) || []);
  }

  setTimeout(() => map.invalidateSize(), 60);

  return { map, L, layer, selectEstado };
}

function haversine(la1, lo1, la2, lo2) {
  const R = 6371, d2r = Math.PI / 180;
  const dLa = (la2 - la1) * d2r, dLo = (lo2 - lo1) * d2r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * d2r) * Math.cos(la2 * d2r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
