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

import { api, auth } from '../api.js';
import { esc, skeleton } from './ui.js';
import { runViewAnimations, enterPanel, enterStagger } from '../animations.js';

export async function mountContenido(root) {
  const me = auth.getUser();
  if (!me || me.rol !== 'Administrador') {
    root.innerHTML = `<section class="card empty">
      <h3>Acceso restringido</h3>
      <p class="text-muted">Publicar galería, centros de acopio, noticias e historias solo está disponible para la
      cuenta <strong>Administrador</strong> (el backend real aplica esta misma regla en cada endpoint).</p>
    </section>`;
    return;
  }

  root.innerHTML = `
    <div class="grid-2">
      <section class="card" id="cnt-foto-card">
        <div class="section-head"><h3>Subir foto de comunidad</h3></div>
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
          <button type="submit" class="btn btn--emerald btn--block">Publicar en la galería</button>
        </form>
      </section>

      <section class="card" id="cnt-foto-list-card">
        <div class="section-head">
          <h3>Galería de la comunidad</h3>
          <span class="badge badge--blue" id="cnt-foto-count">0</span>
        </div>
        <div id="cnt-foto-grid" class="gal-grid">${skeleton(2)}</div>
      </section>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <section class="card" id="cnt-centro-card">
        <div class="section-head"><h3>Nuevo centro de acopio</h3></div>
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
          <button type="submit" class="btn btn--emerald btn--block" style="margin-top:14px">Agregar centro</button>
        </form>
        <div class="nav-divider"></div>
        <div id="cnt-centro-list" class="legend-list">${skeleton(2)}</div>
      </section>

      <section class="card" id="cnt-noticia-card">
        <div class="section-head"><h3>Publicar noticia</h3></div>
        <form id="cnt-noticia-form" novalidate>
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
          <button type="submit" class="btn btn--emerald btn--block" style="margin-top:14px">Publicar noticia</button>
        </form>
      </section>
    </div>

    <section class="card" id="cnt-historia-card" style="margin-top:18px">
      <div class="section-head"><h3>Publicar historia / caso de éxito</h3></div>
      <form id="cnt-historia-form" novalidate>
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
        <button type="submit" class="btn btn--emerald btn--block" style="margin-top:14px">Publicar historia</button>
      </form>
    </section>`;

  runViewAnimations(root, () => {
    enterPanel('#cnt-foto-card', { delay: 0.03 });
    enterPanel('#cnt-foto-list-card', { delay: 0.08 });
    enterStagger('#cnt-centro-card, #cnt-noticia-card, #cnt-historia-card', { delay: 0.14, stagger: 0.06 });
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
      alert(`No se pudo subir la foto: ${err.message}`);
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
      alert(`No se pudo agregar el centro: ${err.message}`);
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
      alert('Noticia publicada. Ya es visible en el sitio público.');
    } catch (err) {
      alert(`No se pudo publicar la noticia: ${err.message}`);
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
      alert('Historia publicada. Ya es visible en el sitio público.');
    } catch (err) {
      alert(`No se pudo publicar la historia: ${err.message}`);
    } finally {
      btn.disabled = false; btn.textContent = 'Publicar historia';
    }
  });
}
