/* ============================================================
   Vista admin: Contenido público (RF fuera del contrato original,
   cierra el gap de "galería/noticias/historias/centros de acopio
   sin endpoint" documentado en CLAUDE.md)
   - Subir fotos reales de una comunidad (multipart, no dataURL).
   - Publicar noticias y historias que se muestran en el sitio público.
   - Dar de alta centros de acopio (catálogo real para Inventario y
     para "centros de acopio cercanos").
   Solo Administrador. Reemplaza al antiguo js/views/galeria.js
   (100% mock, nunca llegó a persistir nada).
   ============================================================ */

import { api, auth } from '../api.js?v=redesign3';
import { esc, skeleton, showError, showSuccess } from './ui.js?v=redesign1';
import { runViewAnimations, enterPanel } from '../animations.js?v=redesign4';

/* Iconos de las pestañas como SVG en línea (stroke=currentColor): un
   glifo Unicode como ⬡ o ◧ cae a la fuente de emoji de Windows y se ve
   como un pictograma a color random -- un SVG siempre se ve igual. */
const TAB_SVG = {
  foto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="10" r="1.4"/><path d="M21 16.5l-5.2-5.2-3.8 3.8-2.6-2.6L3 18"/></svg>',
  centro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7.5L12 3 3 7.5l9 4.5 9-4.5z"/><path d="M3 7.5v9L12 21l9-4.5v-9"/><path d="M12 12v9"/></svg>',
  noticia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12v13a3 3 0 0 0 3 3H7a3 3 0 0 1-3-3V4z"/><path d="M16 8h4v9a3 3 0 0 1-3 3"/><path d="M7.5 8h5M7.5 11.5h5M7.5 15h3"/></svg>',
  historia: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.6-5 4.4 1.5 6.5L12 16.7 6 20l1.5-6.5-5-4.4 6.6-.6 2.9-6z"/></svg>',
};

export async function mountContenido(root) {
  const me = auth.getUser();
  if (!me || me.rol !== 'Administrador') {
    root.innerHTML = `<section class="neu-panel admin-panel empty">
      <h3>Acceso restringido</h3>
      <p class="text-muted">Publicar galería, centros de acopio, noticias e historias solo está disponible para la
      cuenta <strong>Administrador</strong> (el backend real aplica esta misma regla en cada endpoint).</p>
    </section>`;
    return;
  }

  root.innerHTML = `
    <section class="cnt-shell" id="cnt-shell">
      <div class="cnt-header">
        <p class="text-muted text-sm cnt-lead">Todo lo que publiques aquí es visible de inmediato en el sitio de
        visitantes. Elige qué quieres publicar:</p>
        <div class="tabs" id="cnt-tabs" role="tablist">
          <button class="tab is-active" type="button" id="cnt-tab-foto" data-tab="foto" role="tab" aria-selected="true" aria-controls="cnt-panel-foto">
            <span class="tab-ico tab-ico--e">${TAB_SVG.foto}</span> Foto de comunidad</button>
          <button class="tab" type="button" id="cnt-tab-centro" data-tab="centro" role="tab" aria-selected="false" aria-controls="cnt-panel-centro" tabindex="-1">
            <span class="tab-ico tab-ico--b">${TAB_SVG.centro}</span> Centro de acopio</button>
          <button class="tab" type="button" id="cnt-tab-noticia" data-tab="noticia" role="tab" aria-selected="false" aria-controls="cnt-panel-noticia" tabindex="-1">
            <span class="tab-ico tab-ico--a">${TAB_SVG.noticia}</span> Noticia</button>
          <button class="tab" type="button" id="cnt-tab-historia" data-tab="historia" role="tab" aria-selected="false" aria-controls="cnt-panel-historia" tabindex="-1">
            <span class="tab-ico tab-ico--c">${TAB_SVG.historia}</span> Historia</button>
        </div>
      </div>

      <div class="cnt-body">
      <div class="cnt-panel is-active" id="cnt-panel-foto" data-panel="foto" role="tabpanel" aria-labelledby="cnt-tab-foto" tabindex="0">
        <div class="cnt-split">
          <form id="cnt-foto-form" novalidate>
            <label class="field" style="margin-bottom:14px">
              <span>Comunidad</span>
              <select name="comunidad" id="cnt-foto-comunidad" required><option value="">Cargando…</option></select>
            </label>
            <label class="field" style="margin-bottom:14px">
              <span>Descripción de la imagen</span>
              <input name="caption" required minlength="4" placeholder="Ej. Entrega de despensas en el centro comunitario" />
            </label>
            <label class="field" style="margin-bottom:14px">
              <span>Archivo de imagen (JPG, PNG, WEBP o GIF, máx. 5 MB)</span>
              <input name="file" id="cnt-foto-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
            </label>
            <button type="submit" class="neu-btn neu-btn--emerald neu-btn--block">Publicar en la galería</button>
          </form>
          <div>
            <div class="section-head" style="margin-bottom:12px">
              <h4 style="font-size:14px">Galería de la comunidad</h4>
              <span class="badge badge--blue" id="cnt-foto-count">0</span>
            </div>
            <div id="cnt-foto-grid" class="gal-grid">${skeleton(2)}</div>
          </div>
        </div>
      </div>

      <div class="cnt-panel" id="cnt-panel-centro" data-panel="centro" role="tabpanel" aria-labelledby="cnt-tab-centro" tabindex="0">
        <div class="cnt-split">
          <form id="cnt-centro-form" novalidate>
            <div class="form-grid">
              <label class="field col-span-2"><span>Nombre</span>
                <input name="nombre" required minlength="3" placeholder="Ej. Oaxaca — Nodo Sur" /></label>
              <label class="field"><span>Estado</span>
                <input name="estado" required minlength="3" placeholder="Ej. Oaxaca" /></label>
              <label class="field"><span>Capacidad</span>
                <input name="capacidad" required minlength="1" placeholder="Ej. 6 t/día" /></label>
              <label class="field"><span>Latitud</span>
                <input name="latitud" type="number" step="0.000001" required placeholder="17.0732" /></label>
              <label class="field"><span>Longitud</span>
                <input name="longitud" type="number" step="0.000001" required placeholder="-96.7266" /></label>
            </div>
            <button type="submit" class="neu-btn neu-btn--emerald neu-btn--block" style="margin-top:14px">Agregar centro</button>
          </form>
          <div>
            <h4 style="font-size:14px;margin-bottom:12px">Centros ya registrados</h4>
            <div id="cnt-centro-list" class="legend-list">${skeleton(2)}</div>
          </div>
        </div>
      </div>

      <div class="cnt-panel" id="cnt-panel-noticia" data-panel="noticia" role="tabpanel" aria-labelledby="cnt-tab-noticia" tabindex="0">
        <form id="cnt-noticia-form" novalidate class="cnt-form-solo">
          <div class="form-grid">
            <label class="field col-span-2"><span>Título</span>
              <input name="titulo" required minlength="4" /></label>
            <label class="field col-span-2"><span>Resumen</span>
              <input name="resumen" required minlength="10" /></label>
            <label class="field"><span>Zona</span>
              <input name="zona" required minlength="2" /></label>
            <label class="field"><span>Fecha</span>
              <input name="fecha" type="date" required /></label>
            <label class="field"><span>Nivel</span>
              <select name="nivel" required>
                <option value="crítica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="informativa" selected>Informativa</option>
              </select></label>
            <label class="field"><span>Tipo</span>
              <input name="tipo" required minlength="2" placeholder="Ej. Sismo, Inundación…" /></label>
            <label class="field col-span-2"><span>Prioridad (0-100)</span>
              <input name="prioridad" type="number" min="0" max="100" value="50" required /></label>
            <label class="field col-span-2"><span>URL de imagen (opcional)</span>
              <input name="img_url" type="url" placeholder="https://…" /></label>
          </div>
          <button type="submit" class="neu-btn neu-btn--emerald neu-btn--block" style="margin-top:14px">Publicar noticia</button>
        </form>
      </div>

      <div class="cnt-panel" id="cnt-panel-historia" data-panel="historia" role="tabpanel" aria-labelledby="cnt-tab-historia" tabindex="0">
        <form id="cnt-historia-form" novalidate class="cnt-form-solo">
          <div class="form-grid">
            <label class="field col-span-2"><span>Título</span>
              <input name="titulo" required minlength="4" /></label>
            <label class="field"><span>Comunidad</span>
              <input name="comunidad" required minlength="2" placeholder="Ej. Metlatónoc, Guerrero" /></label>
            <label class="field"><span>Impacto</span>
              <input name="impacto" required minlength="2" placeholder="Ej. 1,800 personas" /></label>
            <label class="field col-span-2"><span>Resumen</span>
              <input name="resumen" required minlength="10" /></label>
            <label class="field col-span-2"><span>Cita</span>
              <input name="cita" required minlength="4" placeholder="«…»" /></label>
            <label class="field"><span>Autor de la cita</span>
              <input name="autor" required minlength="2" /></label>
            <label class="field"><span>URL de imagen (opcional)</span>
              <input name="img_url" type="url" placeholder="https://…" /></label>
          </div>
          <button type="submit" class="neu-btn neu-btn--emerald neu-btn--block" style="margin-top:14px">Publicar historia</button>
        </form>
      </div>
      </div>
    </section>`;

  const cntTabs = document.getElementById('cnt-tabs');
  const tabButtons = () => [...cntTabs.querySelectorAll('.tab')];
  function activateTab(btn) {
    tabButtons().forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); t.tabIndex = -1; });
    btn.classList.add('is-active'); btn.setAttribute('aria-selected', 'true'); btn.tabIndex = 0;
    document.querySelectorAll('.cnt-panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === btn.dataset.tab));
  }
  cntTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (btn) activateTab(btn);
  });
  // Patrón WAI-ARIA Tabs: flechas mueven el foco Y activan la pestaña
  // (no solo el clic) -- antes solo se podía cambiar de pestaña con mouse.
  cntTabs.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const tabs = tabButtons();
    const i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length]
      : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length]
      : e.key === 'Home' ? tabs[0] : tabs[tabs.length - 1];
    activateTab(next);
    next.focus();
  });

  runViewAnimations(root, () => {
    enterPanel('#cnt-shell');
  });

  /* ---------- Foto de comunidad ---------- */
  const comunidades = await api.comunidadesPrioridad();
  const selFoto = document.getElementById('cnt-foto-comunidad');
  selFoto.innerHTML = `<option value="">Selecciona…</option>` +
    comunidades.map(c => `<option value="${esc(c.id)}">${esc(c.nombre)} — ${esc(c.estado)}</option>`).join('');
  selFoto.addEventListener('change', () => loadGrid(selFoto.value));

  document.getElementById('cnt-foto-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fileInput = document.getElementById('cnt-foto-file');
    if (!form.checkValidity() || !fileInput.files[0]) { form.reportValidity(); return; }
    const comunidadId = selFoto.value;
    const caption = form.caption.value.trim();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Publicando…';
    try {
      await api.subirImagen(comunidadId, fileInput.files[0], caption);
      form.reset(); selFoto.value = comunidadId;
      loadGrid(comunidadId);
    } catch (err) {
      showError(err.message, 'No se pudo subir la foto');
    } finally {
      btn.disabled = false; btn.textContent = 'Publicar en la galería';
    }
  });

  async function loadGrid(comunidadId) {
    const grid = document.getElementById('cnt-foto-grid');
    if (!comunidadId) { grid.innerHTML = `<p class="text-muted text-sm">Selecciona una comunidad para ver o subir imágenes.</p>`; document.getElementById('cnt-foto-count').textContent = '0'; return; }
    grid.innerHTML = skeleton(2);
    const fotos = await api.galeria(comunidadId);
    document.getElementById('cnt-foto-count').textContent = fotos.length;
    if (!fotos.length) { grid.innerHTML = `<p class="text-muted text-sm">Sin imágenes todavía. Sube la primera.</p>`; return; }
    grid.innerHTML = fotos.map(f => `
      <figure class="gal-item">
        <img src="${esc(f.url)}" alt="${esc(f.caption)}" loading="lazy">
        <figcaption>${esc(f.caption)}<span>${esc(f.fecha || '')}</span></figcaption>
      </figure>`).join('');
  }
  loadGrid('');

  /* ---------- Centros de acopio ---------- */
  async function loadCentros() {
    const list = document.getElementById('cnt-centro-list');
    const centros = await api.centrosAcopioGeo();
    if (!centros.length) { list.innerHTML = `<p class="text-muted text-sm">Sin centros de acopio todavía.</p>`; return; }
    list.innerHTML = centros.map(c => `
      <div class="legend-row" style="justify-content:space-between">
        <span>${esc(c.nombre)} <span class="text-muted text-xs">· ${esc(c.estado)}</span></span>
        <span class="badge badge--blue">${esc(c.capacidad)}</span>
      </div>`).join('');
  }
  loadCentros();

  document.getElementById('cnt-centro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const payload = {
      nombre: fd.get('nombre').trim(),
      estado: fd.get('estado').trim(),
      capacidad: fd.get('capacidad').trim(),
      latitud: Number(fd.get('latitud')),
      longitud: Number(fd.get('longitud')),
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Agregando…';
    try {
      await api.crearCentroAcopio(payload);
      form.reset();
      loadCentros();
    } catch (err) {
      showError(err.message, 'No se pudo agregar el centro');
    } finally {
      btn.disabled = false; btn.textContent = 'Agregar centro';
    }
  });

  /* ---------- Noticias ---------- */
  document.getElementById('cnt-noticia-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const payload = {
      titulo: fd.get('titulo').trim(),
      resumen: fd.get('resumen').trim(),
      zona: fd.get('zona').trim(),
      fecha: fd.get('fecha'),
      nivel: fd.get('nivel'),
      tipo: fd.get('tipo').trim(),
      prioridad: Number(fd.get('prioridad')),
      img_url: fd.get('img_url').trim() || null,
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Publicando…';
    try {
      await api.crearNoticia(payload);
      form.reset();
      showSuccess('Ya es visible en el sitio público.', 'Noticia publicada');
    } catch (err) {
      showError(err.message, 'No se pudo publicar la noticia');
    } finally {
      btn.disabled = false; btn.textContent = 'Publicar noticia';
    }
  });

  /* ---------- Historias ---------- */
  document.getElementById('cnt-historia-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const payload = {
      titulo: fd.get('titulo').trim(),
      comunidad: fd.get('comunidad').trim(),
      resumen: fd.get('resumen').trim(),
      cita: fd.get('cita').trim(),
      autor: fd.get('autor').trim(),
      impacto: fd.get('impacto').trim(),
      img_url: fd.get('img_url').trim() || null,
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Publicando…';
    try {
      await api.crearHistoria(payload);
      form.reset();
      showSuccess('Ya es visible en el sitio público.', 'Historia publicada');
    } catch (err) {
      showError(err.message, 'No se pudo publicar la historia');
    } finally {
      btn.disabled = false; btn.textContent = 'Publicar historia';
    }
  });
}
