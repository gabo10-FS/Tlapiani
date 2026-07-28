/* ============================================================
   Vista admin: Galería de recursos
   Solo administradores pueden subir imágenes de lo que sucede en
   cada comunidad. Estas imágenes aparecen en el mapa (popup + barra
   lateral) y en la galería pública del sitio de visitantes.
   Demo: la imagen se lee con FileReader -> dataURL y se guarda en memoria.
   ============================================================ */

import { api } from '../api.js';
import { esc, skeleton } from './ui.js';
import { runViewAnimations, enterPanel, enterStagger } from '../animations.js';

export async function mountGaleria(root) {
  root.innerHTML = `
    <div class="grid-2">
      <section class="card" id="gal-form-card">
        <div class="section-head"><h3>Subir imagen</h3></div>
        <form id="gal-form" novalidate>
          <label class="field" style="margin-bottom:14px">
            <span>Comunidad</span>
            <select name="comunidad" id="gal-comunidad" required><option value="">Cargando…</option></select>
          </label>
          <label class="field" style="margin-bottom:14px">
            <span>Descripción de la imagen</span>
            <input name="caption" required minlength="4" placeholder="Ej. Entrega de despensas en el centro comunitario" />
          </label>
          <label class="field" style="margin-bottom:14px">
            <span>Archivo de imagen</span>
            <input name="file" id="gal-file" type="file" accept="image/*" required />
          </label>
          <div id="gal-preview" class="gal-preview" hidden></div>
          <button type="submit" class="btn btn--emerald btn--block">Publicar en la galería</button>
          <p class="text-muted text-xs" style="margin-top:10px">Solo administradores pueden publicar. Las imágenes son visibles en el mapa y en el sitio público.</p>
        </form>
      </section>

      <section class="card" id="gal-list-card">
        <div class="section-head">
          <h3>Galería de la comunidad</h3>
          <span class="badge badge--blue" id="gal-count">0</span>
        </div>
        <div id="gal-grid" class="gal-grid">${skeleton(2)}</div>
      </section>
    </div>`;

  const comunidades = await api.comunidades();
  const sel = document.getElementById('gal-comunidad');
  sel.innerHTML = `<option value="">Selecciona…</option>` +
    comunidades.map(c => `<option value="${esc(c.id)}">${esc(c.nombre)} — ${esc(c.estado)}</option>`).join('');

  runViewAnimations(root, () => {
    enterPanel('#gal-form-card', { delay: 0.05 });
    enterPanel('#gal-list-card', { delay: 0.12 });
  });

  let dataUrl = null;
  const fileInput = document.getElementById('gal-file');
  const preview = document.getElementById('gal-preview');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) { preview.hidden = true; dataUrl = null; return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      dataUrl = e.target.result;
      preview.hidden = false;
      preview.innerHTML = `<img src="${dataUrl}" alt="Vista previa">`;
    };
    reader.readAsDataURL(file);
  });

  sel.addEventListener('change', () => loadGrid(sel.value));

  document.getElementById('gal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity() || !dataUrl) { form.reportValidity(); return; }
    const comunidadId = sel.value;
    const caption = form.caption.value.trim();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Publicando…';
    await api.subirImagen(comunidadId, { url: dataUrl, caption });
    btn.disabled = false; btn.textContent = 'Publicar en la galería';
    form.reset(); preview.hidden = true; dataUrl = null;
    sel.value = comunidadId;
    loadGrid(comunidadId);
  });

  async function loadGrid(comunidadId) {
    const grid = document.getElementById('gal-grid');
    if (!comunidadId) { grid.innerHTML = `<p class="text-muted text-sm">Selecciona una comunidad para ver o subir imágenes.</p>`; document.getElementById('gal-count').textContent = '0'; return; }
    grid.innerHTML = skeleton(2);
    const fotos = await api.galeria(comunidadId);
    document.getElementById('gal-count').textContent = fotos.length;
    if (!fotos.length) { grid.innerHTML = `<p class="text-muted text-sm">Sin imágenes todavía. Sube la primera.</p>`; return; }
    grid.innerHTML = fotos.map(f => `
      <figure class="gal-item">
        <img src="${esc(f.url)}" alt="${esc(f.caption)}" loading="lazy">
        <figcaption>${esc(f.caption)}<span>${esc(f.fecha || '')}</span></figcaption>
      </figure>`).join('');
    enterStagger('#gal-grid .gal-item', { stagger: 0.06 });
  }

  loadGrid('');
}
