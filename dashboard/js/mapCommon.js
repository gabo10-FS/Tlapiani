/* ============================================================
   js/mapCommon.js — Utilidades de mapa compartidas (admin + público)
   - Carga Leaflet async (una sola vez).
   - Un solo proveedor de tiles (OpenStreetMap, sin API key) + un
     filtro CSS para el modo oscuro, en vez de dos proveedores
     distintos: CARTO empezó a exigir cuenta/API key para sus tiles
     "dark_all"/"light_all" y eso rompía el mapa con el watermark
     "API KEY REQUIRED" en producción.
   - Marcadores por score de urgencia con popup + galería.
   - Mapa unificado "elige tu estado" + comunidades: un solo mapa
     Leaflet que combina el choropleth de los 32 estados con los
     puntos de comunidades (antes eran dos mapas separados).
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

/* Único proveedor de tiles, sin API key. El modo oscuro se logra con
   un filtro CSS sobre el panel de tiles (.map-dark-tiles), no con un
   segundo proveedor — así el mapa nunca depende de una cuenta/clave
   que pueda dejar de funcionar. */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap';

const currentTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
function applyTileTheme(mapEl, theme) {
  mapEl.classList.toggle('map-dark-tiles', theme === 'dark');
}

/* ---- Un solo observer de tema para toda la app (varios mapas pueden
   estar activos a la vez) ---- */
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

/* fitBounds() calculado contra un contenedor que aún no tiene su
   tamaño final de flexbox puede producir un zoom no finito (Infinity/
   NaN); con zoomSnap:0 (necesario para que México llene el contenedor
   -- ver comentario donde se crea el mapa) no hay redondeo a entero
   que lo evite. Un zoom no finito hace que TODA la proyección
   colapse a (0,0): el contorno completo desaparece y cada marcador
   termina en el mismo pixel, sin importar su lat/lng real. Una vez
   así, ni invalidateSize() ni un fitBounds posterior con bounds
   válidos lo corrigen solos. Verificar y, si hace falta, forzar un
   centro/zoom de respaldo (Ciudad de México, zoom nacional) es lo que
   saca al mapa de ese estado. */
function boundsLookSane(map, bounds) {
  // Un zoom no finito ya es un caso obvio, pero fitBounds() también
  // puede devolver un zoom FINITO y aun así absurdo (todo México
  // proyectado en un par de pixeles) si el tamaño que Leaflet tenía
  // cacheado al calcularlo no era el real. Se compara el span en
  // pixeles de las bounds contra el tamaño real del contenedor: si es
  // muchísimo más chico de lo que debería, el resultado es basura.
  if (!Number.isFinite(map.getZoom())) return false;
  const size = map.getSize();
  if (size.x < 40 || size.y < 40) return false;
  const p1 = map.latLngToContainerPoint(bounds.getNorthWest());
  const p2 = map.latLngToContainerPoint(bounds.getSouthEast());
  const spanX = Math.abs(p2.x - p1.x), spanY = Math.abs(p2.y - p1.y);
  return spanX > size.x * 0.25 || spanY > size.y * 0.25;
}

// Devuelve una Promise que resuelve cuando la corrección (si hizo falta)
// terminó de verdad -- no solo cuando se programó. buildUnifiedMap crea
// los marcadores de comunidades justo después de encuadrar el mapa: si
// esa creación corre ANTES de que el setTimeout de abajo corrija la
// proyección, cada L.marker() calcula su posición contra un mapa que
// todavía devuelve NaN, Leaflet le asigna un transform inválido
// ("translate3d(NaNpx, NaNpx, 0)", que el navegador descarta a "none") y
// como el marcador nunca se volvió a mover con viewreset/zoom después de
// eso, se queda pegado en la esquina (0,0) del contenedor para siempre
// -- ni el fitBounds correctivo ni los resize posteriores lo arreglan,
// porque su _latlng interno nunca cambió, solo su proyección en pixeles
// nació rota. Quien llama debe esperar esta Promise antes de crear
// marcadores.
function safeFitBounds(map, bounds, options) {
  map.fitBounds(bounds, options);
  if (!boundsLookSane(map, bounds)) {
    map.setView([23.6, -102.5], 5, { animate: false });
    // setTimeout, no requestAnimationFrame -- misma razón que en
    // waitForRealSize: no debe depender de que la pestaña esté visible.
    return new Promise((resolve) => {
      setTimeout(() => {
        map.invalidateSize();
        if (boundsLookSane(map, bounds)) map.fitBounds(bounds, options);
        resolve();
      });
    });
  }
  return Promise.resolve();
}

function haversine(la1, lo1, la2, lo2) {
  const R = 6371, d2r = Math.PI / 180;
  const dLa = (la2 - la1) * d2r, dLo = (lo2 - lo1) * d2r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * d2r) * Math.cos(la2 * d2r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* Comparte la lógica de "centros de acopio cercanos" entre el mapa de
   prioridad y el mapa unificado, para no duplicarla dos veces. */
function attachCentrosCercanos(map, L) {
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
  return { addCentrosCercanos, clearCentros };
}

function glowIcon(L, score, scale = 0.7, base = 34) {
  const size = Math.round(base + score * scale);
  return L.divIcon({
    className: 'glow-marker',
    html: `<span class="glow-halo" style="--c:${hexFor(score)};width:${size}px;height:${size}px"></span>
           <span class="glow-core" style="--c:${hexFor(score)}"></span>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Construye el mapa de prioridad en `mapEl` (uso: admin "Mapa de Prioridad").
 * @returns {Promise<{map, L, addCentrosCercanos, clearCentros}>}
 */
export async function buildPriorityMap(mapEl, comunidades, opts = {}) {
  const L = await loadLeaflet();
  ensureThemeObserver();

  mapEl.innerHTML = '';
  applyTileTheme(mapEl, currentTheme());
  themeSwapCallbacks.push((theme) => applyTileTheme(mapEl, theme));

  const map = L.map(mapEl, { zoomControl: false, attributionControl: false, scrollWheelZoom: opts.scrollWheelZoom ?? true })
    .setView(opts.center || [19.4, -99.1], opts.zoom || 5);
  activeCleanups.push(() => map.remove());
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.attribution({ position: 'bottomright', prefix: false }).addAttribution(TILE_ATTRIBUTION).addTo(map);

  L.tileLayer(TILE_URL, { subdomains: 'abc', maxZoom: 19 }).addTo(map);

  // Marcadores "glow" (estilo mapa de calor) por comunidad
  comunidades.forEach(c => {
    const icon = glowIcon(L, c.score);
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

  const { addCentrosCercanos, clearCentros } = attachCentrosCercanos(map, L);
  return { map, L, addCentrosCercanos, clearCentros };
}

/**
 * Mapa unificado "elige tu estado" + comunidades (inspirado en el
 * buscador de delegaciones de Cruz Roja Mexicana): un único Leaflet
 * map con dos capas —
 *   1) el choropleth de los 32 estados (resalta los que ya tienen
 *      comunidades registradas; clic hace zoom a ese estado),
 *   2) los puntos "glow" de cada comunidad (siempre visibles; clic
 *      abre su ficha directamente) —
 * en vez de dos `<div>` de mapa separados como antes.
 *
 * @param {HTMLElement} mapEl
 * @param {object} geojson  FeatureCollection de los 32 estados (properties.name)
 * @param {object[]} comunidades
 * @param {{
 *   onSelectEstado?: (nombreEstado: string, comunidades: object[]) => void,
 *   onSelectComunidad?: (c: object) => void,
 *   onReset?: () => void,
 * }} opts
 */
export async function buildUnifiedMap(mapEl, geojson, comunidades, opts = {}) {
  const L = await loadLeaflet();
  ensureThemeObserver();

  // Sin tiles: como el buscador de delegaciones de Cruz Roja, esto es
  // una ilustración plana de los estados sobre un fondo de marca -- no
  // un mapa real con calles/ciudades/países vecinos. Además de verse
  // más limpio, elimina de raíz cualquier dependencia de un proveedor
  // de tiles (el problema del "API KEY REQUIRED" no puede repetirse
  // aquí porque no se pide ninguna imagen a nadie).
  mapEl.innerHTML = '';
  mapEl.classList.add('map-flat');

  const map = L.map(mapEl, {
    zoomControl: false, attributionControl: false,
    scrollWheelZoom: opts.scrollWheelZoom ?? false,
    minZoom: 3,
    // LA causa de que el mapa "siempre se viera igual de chico":
    // por defecto Leaflet solo usa niveles de zoom ENTEROS, y cada
    // nivel duplica el tamaño. México medía 719 px en el zoom 4 y
    // 1438 px en el 5; como 1438 no cabía, se quedaba clavado en el 4
    // sin importar qué tan grande fuera el contenedor -- de ahí el
    // hueco en blanco. zoomSnap: 0 permite zoom fraccionario (4.7,
    // 5.3...), así que ahora sí llena el espacio disponible.
    zoomSnap: 0,
    zoomDelta: 0.5,
  });
  activeCleanups.push(() => map.remove());
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const comunidadesPorEstado = new Map();
  comunidades.forEach(c => {
    if (!comunidadesPorEstado.has(c.estado)) comunidadesPorEstado.set(c.estado, []);
    comunidadesPorEstado.get(c.estado).push(c);
  });
  const withData = (name) => (comunidadesPorEstado.get(name) || []).length > 0;

  let selected = null;
  // El geoJSON (con sus clicks ya conectados) se agrega al mapa de
  // inmediato, pero el encuadre inicial sigue en vuelo hasta que el
  // await de más abajo resuelve -- un clic justo en ese hueco dispara
  // selectEstado()/flyToBounds() mientras el mapa todavía puede estar
  // corrigiendo un zoom no finito, y esa animación entra en conflicto
  // con la corrección: los marcadores terminan pegados en la esquina
  // del contenedor sin importar su lat/lng real (reproducido con un
  // clic sintético en el primer path.leaflet-interactive disponible).
  // Se ignoran los clics hasta que `ready` sea true.
  let ready = false;
  function stateStyle(feature) {
    const name = feature.properties.name;
    const isSel = selected === name;
    return {
      fillColor: isSel ? 'var(--accent-blue)' : (withData(name) ? 'var(--accent-emerald)' : 'var(--bg-tertiary)'),
      fillOpacity: isSel ? 0.85 : (withData(name) ? 0.78 : 0.9),
      color: 'var(--bg-primary)',
      weight: isSel ? 2.5 : 1.4,
      className: isSel ? 'state-selected-path' : '',
    };
  }

  const stateLayer = L.geoJSON(geojson, {
    style: stateStyle,
    onEachFeature(feature, lyr) {
      const name = feature.properties.name;
      lyr.on('mouseover', () => { if (selected !== name) lyr.setStyle({ fillColor: 'var(--accent-blue)', fillOpacity: withData(name) ? 0.6 : 0.55 }); });
      lyr.on('mouseout', () => { if (selected !== name) lyr.setStyle(stateStyle(feature)); });
      lyr.on('click', () => selectEstado(name));
      lyr.bindTooltip(name, { sticky: true, className: 'state-tooltip' });
    },
  }).addTo(map);
  // El texto + panel de info viven en su propia columna junto al mapa
  // (.map-split en CSS), ya no flotan encima -- el mapa no tiene nada
  // que esquivar, se centra parejo en los cuatro lados.
  const FIT_PAD = { padding: [10, 10] };
  // Bug real reportado: a veces, en el primer fitBounds (el contenedor
  // recién creado, antes de que el layout flex termine de asentarse),
  // Leaflet calcula un zoom no finito. Con zoomSnap:0 no hay redondeo
  // que lo salve, así que TODA la proyección colapsa a (0,0): el
  // contorno de México desaparece y las 10 comunidades se amontonan en
  // un solo punto. Una vez el zoom queda así, ni invalidateSize() ni
  // un fitBounds posterior lo arreglan solos. safeFitBounds fuerza un
  // centro/zoom de respaldo si eso llega a pasar.
  // Se espera a que la corrección (si hizo falta) termine del todo antes
  // de crear los marcadores de abajo -- ver el comentario de
  // safeFitBounds: crearlos mientras el mapa todavía proyecta NaN los
  // deja pegados en la esquina (0,0) para siempre, sin importar qué
  // tan bien quede encuadrado el mapa después.
  await safeFitBounds(map, stateLayer.getBounds(), FIT_PAD);

  // Puntos de comunidades, siempre visibles encima del choropleth.
  const markerByComunidad = new Map();
  comunidades.forEach(c => {
    const icon = glowIcon(L, c.score, 0.4, 24);
    const marker = L.marker([c.lat, c.lng], { icon }).addTo(map);
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      opts.onSelectComunidad && opts.onSelectComunidad(c);
    });
    markerByComunidad.set(c.id, marker);
  });
  // Bug real, verificado con la instancia de Leaflet en vivo: aun con
  // map.getZoom()/getSize() ya correctos en este punto (el await de
  // arriba ya resolvió), un marcador creado aquí puede quedar con
  // transform:none -- Leaflet calculó bien su _point pero nunca llamó
  // a setPosition() sobre el elemento. map.latLngToLayerPoint(latlng)
  // devuelve el pixel correcto si se le pregunta a mano en cualquier
  // momento posterior, y marker.setLatLng(marker.getLatLng()) lo repara
  // al instante -- pero UN solo setTimeout(fn) (siguiente tick) no
  // alcanzó en la reproducción real: el retraso interno de Leaflet no
  // tiene una duración fija conocida. En vez de adivinar un número,
  // varios intentos escalonados (reposicionar un marcador ya correcto
  // no cuesta nada ni se nota) hasta que quede bien.
  [0, 100, 400, 1000, 2500].forEach(delay => {
    setTimeout(() => { markerByComunidad.forEach(m => m.setLatLng(m.getLatLng())); }, delay);
  });
  // A partir de aquí el encuadre inicial ya terminó de verdad -- recién
  // ahora es seguro dejar que un clic dispare flyToBounds() sin arriesgar
  // la corrupción descrita arriba en la declaración de `ready`.
  ready = true;

  function selectEstado(name) {
    if (!ready) return;
    selected = name;
    stateLayer.eachLayer(lyr => lyr.setStyle(stateStyle(lyr.feature)));
    const lista = comunidadesPorEstado.get(name) || [];
    // Encuadrar el CONTORNO del estado, no solo sus puntos: si un estado
    // tiene dos comunidades juntas, encuadrar los puntos hacía un zoom
    // altísimo y se perdía de vista de qué estado se trataba.
    let target = null;
    stateLayer.eachLayer(lyr => {
      if (lyr.feature && lyr.feature.properties.name === name) target = lyr.getBounds();
    });
    if (!target && lista.length) target = L.latLngBounds(lista.map(c => [c.lat, c.lng])).pad(0.6);
    if (target) map.flyToBounds(target.pad(0.12), { ...FIT_PAD, maxZoom: 7, duration: 0.9 });
    opts.onSelectEstado && opts.onSelectEstado(name, lista);
  }

  function goNacional() {
    selected = null;
    stateLayer.eachLayer(lyr => lyr.setStyle(stateStyle(lyr.feature)));
    map.flyToBounds(stateLayer.getBounds(), { ...FIT_PAD, duration: 0.9 });
    opts.onReset && opts.onReset();
  }

  function focusComunidad(c, zoom = 10) {
    map.flyTo([c.lat, c.lng], zoom, { duration: 0.8 });
  }

  // Bug real (no solo de CSS): al montarse, el contenedor #pub-map
  // todavía no tiene su tamaño final de flexbox -- fitBounds calculaba
  // el zoom contra un tamaño provisional. invalidateSize() solo agranda
  // el lienzo sin recalcular el zoom, así que el mapa se quedaba "del
  // mismo tamaño" con espacio vacío alrededor por más que se agrandara
  // el contenedor por CSS.
  // Un setTimeout fijo es frágil (depende de que el layout ya haya
  // terminado justo a los 60ms, y no cubre cambios de tamaño de la
  // ventana). Con ResizeObserver reencuadramos cada vez que el
  // contenedor cambia de tamaño de verdad -- salvo si el usuario ya
  // eligió un estado, para no sacarlo de su vista.
  let lastFitSize = null;
  const refit = () => {
    // .map-split usa 100vw para el ancho completo (ver CSS): cuando la
    // barra de scroll del navegador aparece/desaparece durante el
    // scroll, 100vw cambia unos px y el ResizeObserver dispara un
    // refit aunque el mapa no cambió de tamaño de verdad. Repetir
    // fitBounds() en cada uno de esos disparos podía interrumpir una
    // animación de encuadre a medio camino y dejar el mapa en un
    // estado de transform roto (marcadores colapsados en una esquina).
    // Ignorar cambios de tamaño triviales evita eso de raíz.
    const w = mapEl.offsetWidth, h = mapEl.offsetHeight;
    if (w < 40 || h < 40) return; // contenedor todavía no tiene tamaño real
    if (lastFitSize && Math.abs(w - lastFitSize.w) < 4 && Math.abs(h - lastFitSize.h) < 4) return;
    lastFitSize = { w, h };
    map.invalidateSize();
    if (selected === null) {
      const bounds = stateLayer.getBounds();
      // animate:false -- este refit es correctivo, no una navegación
      // del usuario; no debe competir con (ni ser interrumpido por)
      // un fitBounds/flyTo anterior todavía en vuelo.
      if (bounds.isValid()) safeFitBounds(map, bounds, { ...FIT_PAD, animate: false });
    }
    // Red de seguridad final: si los marcadores nacieron con una
    // proyección rota (el contenedor todavía medía 0x0 cuando
    // buildUnifiedMap los creó -- puede pasar incluso después de esperar
    // el fitBounds inicial, bajo carga real), quedan pegados en la
    // esquina para siempre porque Leaflet nunca vuelve a proyectarlos a
    // menos que se les avise explícitamente. setLatLng con su propia
    // lat/lng (que SIEMPRE fue válida, solo la proyección nació mal) es
    // la forma pública de forzar ese recálculo. refit() es exactamente
    // el momento en que ya sabemos que el contenedor tiene tamaño real,
    // así que es seguro y barato hacerlo aquí cada vez.
    markerByComunidad.forEach(m => m.setLatLng(m.getLatLng()));
  };
  refit();
  if (typeof ResizeObserver !== 'undefined') {
    // setTimeout, no requestAnimationFrame, para debounce -- ver
    // waitForRealSize más arriba: rAF no debe ser el único mecanismo
    // del que depende que el mapa se termine de encuadrar.
    let debounce = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(refit, 50);
    });
    ro.observe(mapEl);
    activeCleanups.push(() => { clearTimeout(debounce); ro.disconnect(); });
  } else {
    setTimeout(refit, 60);
  }

  const { addCentrosCercanos, clearCentros } = attachCentrosCercanos(map, L);
  return { map, L, selectEstado, goNacional, focusComunidad, addCentrosCercanos, clearCentros, comunidadesPorEstado };
}

export { attachCentrosCercanos };
