/* ============================================================
   Vista: Panel de Control de Inventario
   - Formulario de registro (datalist, validación :user-valid nativa,
     dropdown dinámico de comunidades desde la API).
   - Tabla de bienes con filtros de búsqueda rápida.
   ============================================================ */

import { api } from '../api.js?v=redesign3';
import { esc, estadoBadge, skeleton, openDialog, closeDialog, showError } from './ui.js?v=redesign1';
import { runViewAnimations, enterStagger, enterPanel, revealOnScroll } from '../animations.js?v=redesign4';

export async function mountInventario(root) {
  root.innerHTML = `
    <div class="grid-2">
      <section class="neu-panel admin-panel" id="inv-form-card">
        <div class="section-head"><h3>Registrar entrada de bienes</h3></div>
        <form id="inv-form" novalidate>
          <div class="form-grid">
            <label class="field col-span-2">
              <span>Tipo de bien</span>
              <input name="tipo" list="tipos-bien" required minlength="3"
                     placeholder="Ej. Kit de higiene familiar" autocomplete="off" />
              <datalist id="tipos-bien"></datalist>
            </label>
            <label class="field">
              <span>Cantidad</span>
              <input name="cantidad" type="number" required min="1" step="1" placeholder="0" />
            </label>
            <label class="field">
              <span>Unidad</span>
              <select name="unidad" required>
                <option value="">Selecciona…</option>
                <option value="kits">kits</option>
                <option value="kg">kg</option>
                <option value="unidades">unidades</option>
                <option value="litros">litros</option>
              </select>
            </label>
            <label class="field">
              <span>Comunidad de destino</span>
              <select name="comunidad" id="sel-comunidad" required>
                <option value="">Cargando…</option>
              </select>
            </label>
            <label class="field">
              <span>Centro de acopio de origen</span>
              <select name="origen" id="sel-origen" required>
                <option value="">Cargando…</option>
              </select>
            </label>
          </div>
          <p id="inv-sin-origen" class="form-error" hidden>
            No hay centros de acopio registrados todavía. Registra uno primero en
            <a href="#/contenido" class="hash">Contenido público</a>.
          </p>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
            <button type="reset" class="neu-btn">Limpiar</button>
            <button type="submit" class="neu-btn neu-btn--emerald">Registrar lote</button>
          </div>
        </form>
      </section>

      <section class="neu-panel admin-panel" id="inv-stats-card">
        <div class="section-head"><h3>Resumen</h3></div>
        <div class="stat-grid" id="inv-stats">${skeleton(2)}</div>
        <p class="text-muted text-xs" style="margin-top:16px">
          Los lotes registrados quedan disponibles para su despacho en el módulo
          <strong>Despacho &amp; QR</strong>, donde se genera su hash SHA-256 y etiqueta.
        </p>
      </section>
    </div>

    <section class="neu-panel admin-panel" id="inv-table-card" style="margin-top:18px">
      <div class="toolbar">
        <input class="search" id="inv-search" type="search" placeholder="Buscar por tipo de bien o comunidad…" />
        <span class="badge badge--blue" id="inv-count">0 lotes</span>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr><th>ID Lote</th><th>Tipo de bien</th><th>Cantidad</th><th>Destino</th><th>Origen</th><th>Estado</th><th>Fecha</th></tr>
          </thead>
          <tbody id="inv-tbody"><tr><td colspan="7">${skeleton(3)}</td></tr></tbody>
        </table>
      </div>
    </section>`;

  // Cargar catálogos en paralelo
  // Nota: usamos comunidadesPrioridad() (endpoint real, con comunidad_id numérico)
  // en vez de comunidades() (mock) porque el backend exige comunidad_destino_id.
  const [tipos, comunidades, centros, lotes] = await Promise.all([
    api.tiposBien(), api.comunidadesPrioridad(), api.centrosAcopio(), api.lotes(),
  ]);

  document.getElementById('tipos-bien').innerHTML =
    tipos.map(t => `<option value="${esc(t)}"></option>`).join('');
  document.getElementById('sel-comunidad').innerHTML =
    `<option value="">Selecciona…</option>` +
    comunidades.map(c => `<option value="${c.id}" data-nombre="${esc(c.nombre)}">${esc(c.nombre)} — ${esc(c.estado)}</option>`).join('');
  document.getElementById('sel-origen').innerHTML =
    `<option value="">Selecciona…</option>` +
    centros.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  // Sin centros de acopio el <select required> nunca puede validar, y el
  // navegador solo muestra un tooltip nativo genérico al enviar -- se
  // avisa explícitamente por qué, con un enlace directo a resolverlo.
  if (!centros.length) {
    const warn = document.getElementById('inv-sin-origen');
    warn.hidden = false;
    document.querySelector('#inv-form button[type="submit"]').disabled = true;
  }

  let data = lotes;
  renderStats(data);
  renderTable(data);

  // Búsqueda rápida
  document.getElementById('inv-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = data.filter(l =>
      l.tipo.toLowerCase().includes(q) || l.comunidad.toLowerCase().includes(q) || l.id.toLowerCase().includes(q));
    renderTable(filtered);
  });

  // Alta de lote
  document.getElementById('inv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const selComunidad = document.getElementById('sel-comunidad');
    const comunidadOpt = selComunidad.options[selComunidad.selectedIndex];
    const payload = {
      tipo: fd.get('tipo').trim(),
      cantidad: Number(fd.get('cantidad')),
      unidad: fd.get('unidad'),
      comunidad: comunidadOpt ? comunidadOpt.dataset.nombre : '',
      comunidadId: Number(fd.get('comunidad')),
      origen: fd.get('origen'),
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Registrando…';
    try {
      const nuevo = await api.crearLote(payload);
      form.reset();
      data = [nuevo, ...data];
      renderStats(data);
      renderTable(data);
      showCreated(nuevo);
    } catch (err) {
      showError(err.message, 'No se pudo registrar el lote');
    } finally {
      btn.disabled = false; btn.textContent = 'Registrar lote';
    }
  });

  // Animaciones de entrada (con cleanup automático al salir)
  runViewAnimations(root, () => {
    enterPanel('#inv-form-card', { delay: 0.05 });
    enterPanel('#inv-stats-card', { delay: 0.12 });
    enterStagger('#inv-stats .stat', { delay: 0.2 });
    revealOnScroll('#inv-tbody tr');
  });

  function renderStats(rows) {
    const total = rows.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
    const enRuta = rows.filter(l => l.estado === 'En Ruta').length;
    document.getElementById('inv-stats').innerHTML = `
      <div class="stat neu-metric"><div class="stat__label">Lotes activos</div><div class="stat__value">${rows.length}</div></div>
      <div class="stat neu-metric"><div class="stat__label">Unidades totales</div><div class="stat__value">${total.toLocaleString('es-MX')}</div></div>
      <div class="stat neu-metric"><div class="stat__label">En ruta</div><div class="stat__value">${enRuta}</div></div>`;
  }

  function renderTable(rows) {
    document.getElementById('inv-count').textContent = `${rows.length} lote${rows.length === 1 ? '' : 's'}`;
    const tbody = document.getElementById('inv-tbody');
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty">Sin resultados.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(l => `
      <tr>
        <td><span class="hash">${esc(l.id)}</span></td>
        <td>${esc(l.tipo)}</td>
        <td>${Number(l.cantidad).toLocaleString('es-MX')} ${esc(l.unidad)}</td>
        <td>${esc(l.comunidad)}</td>
        <td>${esc(l.origen)}</td>
        <td><span class="badge badge--${estadoBadge(l.estado)}">${esc(l.estado)}</span></td>
        <td>${esc(l.fecha)}</td>
      </tr>`).join('');
    // revealOnScroll(), no solo refreshScroll(): las filas de arriba son
    // <tr> nuevos (innerHTML reemplazó los anteriores), así que hace
    // falta volver a registrarlas para el reveal-on-scroll, no solo
    // reposicionar los triggers de las filas viejas que ya no existen.
    revealOnScroll('#inv-tbody tr');
  }

  function showCreated(l) {
    openDialog(`
      <div class="dialog__header">
        <span class="brand-mark">✓</span>
        <div><h2>Lote registrado</h2><p class="text-muted">${esc(l.id)}</p></div>
      </div>
      <div class="legend-list">
        <div class="legend-row"><span class="text-muted">Tipo</span><strong style="margin-left:auto">${esc(l.tipo)}</strong></div>
        <div class="legend-row"><span class="text-muted">Cantidad</span><strong style="margin-left:auto">${Number(l.cantidad).toLocaleString('es-MX')} ${esc(l.unidad)}</strong></div>
        <div class="legend-row"><span class="text-muted">Destino</span><strong style="margin-left:auto">${esc(l.comunidad)}</strong></div>
      </div>
      <p class="text-muted text-xs">Hash SHA-256 firmado:</p>
      <p class="hash">${esc(l.hash || '—')}</p>
      <div class="dialog__footer">
        <button class="btn btn--ghost" data-close>Cerrar</button>
        <a class="btn btn--emerald" href="#/despacho" data-close>Ir a despacho →</a>
      </div>`);
    document.querySelectorAll('#app-dialog [data-close]').forEach(b =>
      b.addEventListener('click', closeDialog));
  }
}
