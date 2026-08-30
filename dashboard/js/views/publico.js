/* ============================================================
   Vista: Sitio Público (modo visitante)
   Hero con parallax, mapa de recursos con panel tipo "ficha",
   noticias por prioridad de la IA, historias/casos de éxito,
   misión/visión, objetivos y CTA.
   ============================================================ */

import { api } from '../api.js';
import { esc, scoreBadge, openDialog, closeDialog } from './ui.js';
import { buildPriorityMap, buildStateMap } from '../mapCommon.js';
import { runViewAnimations, enterStagger, revealOnScroll, refreshScroll, gsap } from '../animations.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function mountPublico(root, scrollTo) {
  root.innerHTML = `
    <!-- HERO sólido a pantalla completa (fuera del contenedor .pub) -->
    <section class="hero-solid" id="sec-top">
      <div class="hero-box">
        <div class="hero-solid__inner">
          <span class="hero-kicker">◈ TLAPIANI · custodia de la ayuda humanitaria</span>
          <h1 class="hero-giant">
            <span class="hg-line">LA AYUDA</span>
            <span class="hg-line">QUE <em>SÍ</em></span>
            <span class="hg-line">LLEGA</span>
          </h1>
          <p class="hero-sub">Priorización con IA · integridad con SHA-256 · transparencia que cualquiera puede verificar.</p>
          <div class="landing__cta hero-cta">
            <a class="btn btn--lg hero-btn-solid" href="#/transparencia">Rastrear un lote →</a>
            <a class="btn btn--ghost btn--lg hero-btn-ghost" href="#/publico" data-scroll="mapa">Ver el mapa</a>
          </div>
        </div>
        <div class="hero-scroll-hint" aria-hidden="true"><span>Desliza</span> ↓</div>
      </div>
    </section>

    <div class="pub">
      <!-- UBICA TU ESTADO -->
      <section class="pub-section" id="sec-estados">
        <span class="pub-eyebrow">Cobertura nacional</span>
        <h3>Ubica tu estado</h3>
        <p class="pub-lead">Selecciona un estado en el mapa: si ya tenemos comunidades ahí verás cuáles son,
        y si no, sabrás que tu apoyo puede ser el primer paso para llegar.</p>
        <div class="grid-map" style="margin-top:22px">
          <div class="card map-card">
            <div id="state-map"></div>
          </div>
          <aside class="card cpanel" id="state-panel">
            <div class="cpanel__empty">
              <div class="cpanel__empty-ico">◈</div>
              <h4>Selecciona un estado</h4>
              <p class="text-muted text-sm">Haz clic en el mapa para ver las comunidades atendidas ahí.</p>
            </div>
          </aside>
        </div>
      </section>

      <!-- MAPA DE RECURSOS -->
      <section class="pub-section" id="sec-mapa">
        <span class="pub-eyebrow">Dónde actuamos</span>
        <h3>Mapa de prioridad y recursos</h3>
        <p class="pub-lead">Explora las comunidades atendidas. Haz clic en un punto para ver su nivel de
        urgencia, sus recursos clave y la galería de lo que está sucediendo ahí.</p>
        <div class="grid-map" style="margin-top:22px">
          <div class="card map-card">
            <div class="map-topbar">
              <span class="pill-count" id="pub-map-count">— comunidades</span>
              <label class="switch" title="Ubica los centros de acopio más cercanos a ti">
                <span class="switch__label">Centros de acopio cercanos</span>
                <input type="checkbox" id="pub-cercanos" />
                <span class="switch__track"><span class="switch__thumb"></span></span>
              </label>
            </div>
            <div id="pub-map"><div class="map-skeleton">Cargando mapa…</div></div>
          </div>
          <aside class="card cpanel" id="pub-map-side">
            <div class="cpanel__empty">
              <div class="cpanel__empty-ico">◉</div>
              <h4>Selecciona un punto</h4>
              <p class="text-muted text-sm">Haz clic en una comunidad del mapa para ver su información, recursos y galería.</p>
            </div>
          </aside>
        </div>
      </section>

      <!-- NOTICIAS -->
      <section class="pub-section pub-section--tint" id="sec-noticias">
        <span class="pub-eyebrow">Entérate de lo que está pasando</span>
        <h3>Noticias y alertas · ordenadas por prioridad de la IA</h3>
        <div class="news-grid" id="news-grid"></div>
      </section>

      <!-- HISTORIAS -->
      <section class="pub-section" id="sec-historias">
        <span class="pub-eyebrow">Historias reales</span>
        <h3>Casos donde la trazabilidad marcó la diferencia</h3>
        <div class="hist-grid" id="hist-grid"></div>
      </section>

      <!-- MISIÓN / VISIÓN -->
      <section class="pub-section" id="sec-mision">
        <span class="pub-eyebrow">Quiénes somos</span>
        <h3>Custodiamos la confianza, no solo los recursos</h3>
        <p class="pub-lead">«Tlapiani» significa en náhuatl «el que guarda y custodia». Ese es nuestro
        compromiso: proteger la ayuda humanitaria en cada eslabón de su recorrido.</p>
        <div class="mv-grid">
          <div class="mv-card card"><h4>◈ Misión</h4>
            <p>Reducir la brecha en la distribución de recursos humanitarios hacia las zonas de alta
            marginación rural, garantizando que cada lote se asigne con criterios objetivos y pueda auditarse de principio a fin.</p></div>
          <div class="mv-card card"><h4>✦ Visión</h4>
            <p>Un país donde ninguna comunidad quede rezagada por falta de información, y donde cualquier
            ciudadano, donante o autoridad pueda verificar —sin intermediarios— que la ayuda llegó íntegra.</p></div>
        </div>
      </section>

      <!-- OBJETIVOS -->
      <section class="pub-section" id="sec-objetivos">
        <span class="pub-eyebrow">Nuestros objetivos</span>
        <h3>Hacia dónde trabajamos</h3>
        <div class="obj-grid">
          <div class="obj-card card"><div class="obj-num">01</div><h4>Priorizar con justicia</h4><p>Dirigir la ayuda primero a las comunidades con mayor score de urgencia.</p></div>
          <div class="obj-card card"><div class="obj-num">02</div><h4>Blindar la integridad</h4><p>Sellar cada lote con un hash SHA-256 imposible de alterar sin dejar rastro.</p></div>
          <div class="obj-card card"><div class="obj-num">03</div><h4>Abrir la información</h4><p>Un portal público para consultar el historial completo de cualquier lote.</p></div>
          <div class="obj-card card"><div class="obj-num">04</div><h4>Llegar a la última milla</h4><p>Validar la entrega en campo incluso sin conexión.</p></div>
        </div>
      </section>

      <!-- QUÉ HACEMOS -->
      <section class="pub-section pub-section--tint" id="sec-hacemos">
        <span class="pub-eyebrow">Qué puedes hacer aquí</span>
        <h3>Una plataforma, tres capas de confianza</h3>
        <div class="feat-grid">
          <div class="feat-card card"><div class="feat-ico e">◉</div><h4>Priorización con IA</h4><p>Un mapa muestra qué comunidades necesitan ayuda con más urgencia.</p></div>
          <div class="feat-card card"><div class="feat-ico b">▤</div><h4>Registro de inventario</h4><p>Los centros de acopio generan lotes trazables listos para despacho.</p></div>
          <div class="feat-card card"><div class="feat-ico a">⇉</div><h4>Despacho con QR</h4><p>Cada lote viaja con una etiqueta QR que codifica su hash único.</p></div>
          <div class="feat-card card"><div class="feat-ico c">◇</div><h4>Transparencia pública</h4><p>Cualquiera rastrea la cadena de custodia y detecta manipulación.</p></div>
        </div>
      </section>

      <section class="pub-cta card" id="sec-cta">
        <h3>Verifica una entrega ahora mismo</h3>
        <p>Ingresa el identificador de un lote y observa su recorrido completo, etapa por etapa.</p>
        <div class="landing__cta">
          <a class="btn btn--emerald btn--lg" href="#/transparencia">Ir al Portal de Transparencia →</a>
          <button class="btn btn--ghost btn--lg" id="pub-admin" type="button">Soy administrador</button>
        </div>
      </section>

      <footer class="pub-footer">
        <p>◈ Tlapiani — Ecosistema de trazabilidad de ayuda humanitaria · Proyecto académico (demo).</p>
      </footer>
    </div>`;

  document.getElementById('pub-admin').addEventListener('click', () =>
    document.getElementById('admin-access')?.click());

  // Datos en paralelo
  const [noticias, historias, comunidades, centros] = await Promise.all([
    api.noticias(), api.historias(), api.comunidadesPrioridad(), api.centrosGeo(),
  ]);
  renderNoticias(noticias);
  renderHistorias(historias);

  // Galería precargada para thumbnails
  const galeriaMap = {};
  await Promise.all(comunidades.map(async c => { galeriaMap[c.id] = await api.galeria(c.id); }));

  // Agrupar comunidades por estado, para el buscador "Ubica tu estado"
  const comunidadesPorEstado = new Map();
  comunidades.forEach(c => {
    if (!comunidadesPorEstado.has(c.estado)) comunidadesPorEstado.set(c.estado, []);
    comunidadesPorEstado.get(c.estado).push(c);
  });
  let pubMapInstance = null;

  // Animaciones
  runViewAnimations(root, () => {
    if (reduced) {
      gsap.set('.hero-solid__inner > *', { autoAlpha: 1 });
    } else {
      const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
      intro.from('.hero-kicker', { y: 20, autoAlpha: 0, duration: 0.5 })
           .from('.hg-line', { y: 60, autoAlpha: 0, duration: 0.8, stagger: 0.12 }, '-=0.15')
           .from('.hero-sub', { y: 20, autoAlpha: 0, duration: 0.5 }, '-=0.35')
           .from('.hero-cta .btn', { y: 18, autoAlpha: 0, duration: 0.45, stagger: 0.1 }, '-=0.3')
           .from('.hero-scroll-hint', { autoAlpha: 0, duration: 0.5 }, '-=0.15');
      // Parallax del hero: solo transform + opacidad (no altera el layout).
      gsap.to('.hero-solid__inner', {
        yPercent: -24, autoAlpha: 0, ease: 'none',
        scrollTrigger: { trigger: '#sec-top', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero-scroll-hint', {
        autoAlpha: 0, ease: 'none',
        scrollTrigger: { trigger: '#sec-top', start: 'top top', end: '30% top', scrub: true },
      });
    }
    revealOnScroll('.news-card');
    revealOnScroll('.hist-card');
    revealOnScroll('.mv-card');
    revealOnScroll('.obj-card');
    revealOnScroll('.feat-card');
    revealOnScroll('#sec-cta');
  });

  // Mapa "elige tu estado"
  try {
    const estadosGeo = await fetch('./data/mx-estados.geojson').then(r => {
      if (!r.ok) throw new Error(`geojson ${r.status}`);
      return r.json();
    });
    await buildStateMap(document.getElementById('state-map'), estadosGeo, comunidadesPorEstado, {
      onSelect: (nombreEstado, lista) => renderStatePanel(nombreEstado, lista),
    });
  } catch (err) {
    document.getElementById('state-map').innerHTML = `<div class="map-skeleton">No se pudo cargar el mapa de estados.</div>`;
    console.error(err);
  }

  // Mapa público
  document.getElementById('pub-map-count').textContent = `${comunidades.length} comunidades`;
  try {
    const { map: mapaPuntos, addCentrosCercanos, clearCentros } = await buildPriorityMap(document.getElementById('pub-map'), comunidades, {
      galeria: galeriaMap, scrollWheelZoom: false,
      onSelect: (c) => renderCommunityPanel(c),
    });
    pubMapInstance = mapaPuntos;
    document.getElementById('pub-cercanos').addEventListener('change', (e) => {
      const side = document.getElementById('pub-map-side');
      if (!e.target.checked) { clearCentros(); return; }
      if (!centros.length) {
        side.innerHTML = `<div class="cpanel__empty"><h4>Centros cercanos</h4><p class="text-muted text-sm">Todavía no hay centros de acopio registrados.</p></div>`;
        e.target.checked = false;
        return;
      }
      side.innerHTML = `<div class="cpanel__empty"><div class="cpanel__empty-ico">📍</div><h4>Buscando tu ubicación…</h4><p class="text-muted text-sm">Autoriza el acceso a tu ubicación en el navegador.</p></div>`;
      addCentrosCercanos(centros, (res) => {
        if (res.error) { side.innerHTML = `<div class="cpanel__empty"><h4>Centros cercanos</h4><p class="text-muted text-sm">${esc(res.error)}</p></div>`; return; }
        side.innerHTML = `<h4 class="cpanel__title">Centros de acopio más cercanos</h4>
          <div class="near-list">${res.centros.map(ce => `<div class="near-item"><span>${esc(ce.nombre)}</span><span class="badge badge--blue">${ce.dist.toFixed(0)} km</span></div>`).join('')}</div>`;
        enterStagger('#pub-map-side .near-item', { stagger: 0.05 });
      });
    });
    refreshScroll();
  } catch (err) {
    document.getElementById('pub-map').innerHTML = `<div class="map-skeleton">No se pudo cargar el mapa.</div>`;
    console.error(err);
  }

  /* ---------- Ficha de comunidad ---------- */

  // Medidor "dial" limpio: pista gris + relleno de color hasta el score.
  function gaugeSVG(score) {
    const cx = 100, cy = 96, r = 76, sw = 15;
    const pt = (s) => { const th = Math.PI * (1 - s / 100); return [cx + r * Math.cos(th), cy - r * Math.sin(th)]; };
    const arc = (s1, s2) => { const [a, b] = pt(s1), [c2, d] = pt(s2);
      return `M${a.toFixed(1)} ${b.toFixed(1)} A ${r} ${r} 0 0 1 ${c2.toFixed(1)} ${d.toFixed(1)}`; };
    const col = score >= 80 ? 'var(--accent-crimson)' : score >= 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)';
    const lbl = score >= 80 ? 'Crítica' : score >= 50 ? 'Alta' : 'Segura';
    return `<svg class="gauge-svg" viewBox="0 0 200 116" role="img" aria-label="Score ${score} ${lbl}">
      <path d="${arc(0, 100)}" stroke="var(--bg-tertiary)" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      <path d="${arc(0, Math.max(1.5, score))}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      <text x="100" y="84" text-anchor="middle" class="gauge-score">${score}</text>
      <text x="100" y="106" text-anchor="middle" class="gauge-label" fill="${col}">${lbl}</text>
    </svg>`;
  }

  /* ---------- Panel del estado seleccionado ---------- */
  function renderStatePanel(nombreEstado, lista) {
    const panel = document.getElementById('state-panel');
    if (!lista.length) {
      panel.innerHTML = `
        <div class="cpanel__head"><div class="cpanel__title-wrap"><h4 class="cpanel__name">${esc(nombreEstado)}</h4></div></div>
        <p class="text-muted text-sm" style="margin-top:8px">Todavía no tenemos comunidades registradas en este estado.
        Tu apoyo puede ser el primer paso para llegar aquí.</p>`;
      return;
    }
    panel.innerHTML = `
      <div class="cpanel__head">
        <div class="cpanel__title-wrap"><h4 class="cpanel__name">${esc(nombreEstado)}</h4></div>
        <span class="badge badge--emerald">${lista.length} comunidad${lista.length === 1 ? '' : 'es'}</span>
      </div>
      <div class="legend-list" id="state-comunidades" style="margin-top:12px"></div>`;
    const list = document.getElementById('state-comunidades');
    list.innerHTML = lista.map(c => {
      const b = scoreBadge(c.score);
      return `<button class="legend-row legend-row--btn" data-goto="${esc(c.id)}" style="justify-content:space-between">
        <span>${esc(c.nombre)}</span><span class="badge badge--${b.cls}">${c.score}</span></button>`;
    }).join('');
    lista.forEach(c => {
      list.querySelector(`[data-goto="${c.id}"]`)?.addEventListener('click', () => {
        document.getElementById('sec-mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          pubMapInstance && pubMapInstance.flyTo([c.lat, c.lng], 10);
          renderCommunityPanel(c);
        }, 450);
      });
    });
    enterStagger('#state-comunidades .legend-row--btn', { stagger: 0.05 });
  }

  function resourceIcons() {
    const item = (cls, cap, svg) => `<div class="res-item"><span class="res-ico ${cls}">${svg}</span><small>${cap}</small></div>`;
    return `<div class="res-icons">
      ${item('crimson', 'Médico', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>')}
      ${item('blue', 'Agua', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s7 7.5 7 12a7 7 0 1 1-14 0C5 9.5 12 2 12 2z"/></svg>')}
      ${item('amber', 'Alimentos', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2v8M9 2v8M7.5 10v12M15 2c-2 0-3 3-3 6 0 2 1 3 3 3v11"/></svg>')}
    </div>`;
  }

  function renderCommunityPanel(c, expanded = false) {
    const side = document.getElementById('pub-map-side');
    const fotos = galeriaMap[c.id] || [];
    const shown = expanded ? fotos : fotos.slice(0, 4);
    const sev = c.score >= 80 ? { cls: 'crimson', lbl: 'Crítica' } : c.score >= 50 ? { cls: 'amber', lbl: 'Alta' } : { cls: 'emerald', lbl: 'Segura' };
    const thumbs = shown.length
      ? shown.map(f => `<figure class="gal-item"><img src="${esc(f.url)}" alt="${esc(f.caption)}" loading="lazy"><figcaption>${esc(f.caption)}</figcaption></figure>`).join('')
      : Array.from({ length: 4 }, () => `<div class="gal-item gal-item--empty">▦</div>`).join('');
    side.innerHTML = `
      <div class="cpanel__head">
        <div class="cpanel__title-wrap">
          <h4 class="cpanel__name">${esc(c.nombre)}</h4>
          <span class="text-muted text-sm">${esc(c.estado)}${c.poblacion != null ? ` · ${c.poblacion.toLocaleString('es-MX')} hab.` : ''}</span>
        </div>
        <span class="badge badge--${sev.cls}">${sev.lbl}</span>
      </div>
      <div class="gauge">${gaugeSVG(c.score)}</div>
      <div class="cpanel__block">
        <h5>Recursos clave disponibles</h5>
        ${resourceIcons()}
      </div>
      <div class="cpanel__block">
        <div class="cpanel__block-head">
          <h5>Galería de la comunidad</h5>
          ${fotos.length ? `<span class="text-muted text-xs">${fotos.length} fotos</span>` : ''}
        </div>
        <div class="gal-grid">${thumbs}</div>
        ${(!expanded && fotos.length > 4) ? `<button class="btn btn--ghost btn--sm btn--block" id="gal-more" style="margin-top:10px">Cargar más</button>` : ''}
      </div>
      <div class="cpanel__links">
        <button class="cpanel__link" id="cp-contacto"><span class="cpanel__link-ico">◍</span> Contactar líder comunitario</button>
        <button class="cpanel__link cpanel__link--donar" id="cp-donar"><span class="cpanel__link-ico">♡</span> Donar a esta comunidad</button>
      </div>`;
    document.getElementById('gal-more')?.addEventListener('click', () => renderCommunityPanel(c, true));
    document.getElementById('cp-contacto').addEventListener('click', () => {
      openDialog(`<div class="dialog__header"><span class="brand-mark">◍</span><div><h2>Contactar líder</h2><p class="text-muted">${esc(c.nombre)}</p></div></div>
        <p class="text-muted text-sm">En la versión completa aquí verías el contacto del comité comunitario para coordinar entregas y verificaciones.</p>
        <div class="dialog__footer"><button class="btn btn--emerald" data-close>Entendido</button></div>`);
      document.querySelector('#app-dialog [data-close]').addEventListener('click', closeDialog);
    });
    document.getElementById('cp-donar').addEventListener('click', () => {
      openDialog(`<div class="dialog__header"><span class="brand-mark">♡</span><div><h2>Apoya a ${esc(c.nombre)}</h2></div></div>
        <p class="text-muted text-sm">Gracias por tu interés. En la versión completa se integraría aquí la pasarela de donación dirigida a esta comunidad.</p>
        <div class="dialog__footer"><button class="btn btn--emerald" data-close>Cerrar</button></div>`);
      document.querySelector('#app-dialog [data-close]').addEventListener('click', closeDialog);
    });
    enterStagger('#pub-map-side .gauge, #pub-map-side .cpanel__block, #pub-map-side .cpanel__links', { stagger: 0.06 });
  }

  function renderNoticias(items) {
    const grid = document.getElementById('news-grid');
    if (!items.length) { grid.innerHTML = `<p class="text-muted text-sm">Sin noticias publicadas todavía.</p>`; return; }
    grid.innerHTML = items.map(n => `
      <article class="news-card card">
        <div class="news-img" style="background-image:url('${esc(n.img || '')}')">
          <span class="badge badge--${n.nivel === 'crítica' ? 'crimson' : n.nivel === 'alta' ? 'amber' : 'blue'}">${esc(n.tipo)} · ${esc(n.nivel)}</span>
        </div>
        <div class="news-body">
          <div class="news-meta"><span>${esc(n.zona)}</span><span>${esc(n.fecha)}</span></div>
          <h4>${esc(n.titulo)}</h4>
          <p>${esc(n.resumen)}</p>
          <div class="news-prio"><span class="prio-bar"><span style="width:${n.prioridad}%"></span></span>Prioridad IA ${n.prioridad}</div>
        </div>
      </article>`).join('');
  }

  function renderHistorias(items) {
    const grid = document.getElementById('hist-grid');
    if (!items.length) { grid.innerHTML = `<p class="text-muted text-sm">Sin historias publicadas todavía.</p>`; return; }
    grid.innerHTML = items.map(h => `
      <article class="hist-card card">
        <div class="hist-img" style="background-image:url('${esc(h.img || '')}')"></div>
        <div class="hist-body">
          <span class="badge badge--emerald">${esc(h.impacto)}</span>
          <h4>${esc(h.titulo)}</h4>
          <p class="text-muted text-sm">${esc(h.comunidad)}</p>
          <p>${esc(h.resumen)}</p>
          <blockquote class="hist-quote">${esc(h.cita)}<cite>— ${esc(h.autor)}</cite></blockquote>
        </div>
      </article>`).join('');
  }

  // Scroll a sección indicada por la nav pública
  if (scrollTo && scrollTo !== 'top') {
    setTimeout(() => document.getElementById('sec-' + scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  } else {
    window.scrollTo({ top: 0 });
  }
}
