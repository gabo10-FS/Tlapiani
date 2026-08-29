/* ============================================================
   Vista: Gestión de Usuarios (RF-2.1, solo Administrador)
   - El backend real solo expone dos endpoints:
       POST /api/v1/usuarios/registrar   (crear)
       GET  /api/v1/usuarios             (listar)
     No hay editar, desactivar ni cambiar contraseña todavía
     (ver backend/README.md §6 / INTEGRACION.md) — a propósito
     esta vista NO inventa esas operaciones.
   ============================================================ */

import { api, auth } from '../api.js';
import { esc, skeleton } from './ui.js';
import { runViewAnimations, enterPanel, enterStagger, revealOnScroll } from '../animations.js';

const ROLES = ['Administrador', 'Donante', 'Transportista'];

function badgeRol(rol) {
  const cls = rol === 'Administrador' ? 'crimson' : rol === 'Transportista' ? 'blue' : 'emerald';
  return `<span class="badge badge--${cls}">${esc(rol)}</span>`;
}

export async function mountUsuarios(root) {
  const me = auth.getUser();
  if (!me || me.rol !== 'Administrador') {
    root.innerHTML = `<section class="card empty">
      <h3>Acceso restringido</h3>
      <p class="text-muted">La gestión de usuarios solo está disponible para la cuenta <strong>Administrador</strong>
      (el backend real aplica esta misma regla en <span class="hash">GET/POST /api/v1/usuarios*</span>).</p>
    </section>`;
    return;
  }

  root.innerHTML = `
    <div class="grid-2">
      <section class="card" id="usr-form-card">
        <div class="section-head"><h3>Registrar usuario</h3></div>
        <form id="usr-form" novalidate>
          <div class="form-grid">
            <label class="field col-span-2">
              <span>Nombre completo</span>
              <input name="nombre_completo" required minlength="3" placeholder="Ej. Sofía Ramírez" />
            </label>
            <label class="field col-span-2">
              <span>Correo electrónico</span>
              <input name="email" type="email" required placeholder="persona@tlapiani.mx" />
            </label>
            <label class="field">
              <span>Contraseña</span>
              <input name="password" type="password" required minlength="8" placeholder="Mínimo 8 caracteres" />
            </label>
            <label class="field">
              <span>Rol</span>
              <select name="rol" required>
                <option value="">Selecciona…</option>
                ${ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="dialog__footer" style="margin-top:18px">
            <button type="reset" class="btn btn--ghost">Limpiar</button>
            <button type="submit" class="btn btn--emerald">Registrar usuario</button>
          </div>
        </form>
      </section>

      <section class="card" id="usr-stats-card">
        <div class="section-head"><h3>Resumen</h3></div>
        <div class="stat-grid" id="usr-stats">${skeleton(2)}</div>
      </section>
    </div>

    <section class="card" id="usr-table-card" style="margin-top:18px">
      <div class="toolbar">
        <input class="search" id="usr-search" type="search" placeholder="🔍 Buscar por nombre o correo…" />
        <span class="badge badge--blue" id="usr-count">0 usuarios</span>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Activo</th><th>Alta</th></tr></thead>
          <tbody id="usr-tbody"><tr><td colspan="5">${skeleton(3)}</td></tr></tbody>
        </table>
      </div>
    </section>`;

  let data = [];
  try {
    data = await api.usuarios();
  } catch (err) {
    document.getElementById('usr-tbody').innerHTML =
      `<tr><td colspan="5"><div class="empty">No se pudo cargar la lista: ${esc(err.message)}</div></td></tr>`;
  }
  renderStats(data);
  renderTable(data);

  document.getElementById('usr-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderTable(data.filter(u =>
      u.nombre_completo.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  });

  document.getElementById('usr-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const payload = {
      nombre_completo: fd.get('nombre_completo').trim(),
      email: fd.get('email').trim(),
      password: fd.get('password'),
      rol: fd.get('rol'),
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Registrando…';
    try {
      const nuevo = await api.crearUsuario(payload);
      form.reset();
      data = [nuevo, ...data];
      renderStats(data);
      renderTable(data);
    } catch (err) {
      alert(`No se pudo registrar el usuario: ${err.message}`);
    } finally {
      btn.disabled = false; btn.textContent = 'Registrar usuario';
    }
  });

  runViewAnimations(root, () => {
    enterPanel('#usr-form-card', { delay: 0.05 });
    enterPanel('#usr-stats-card', { delay: 0.12 });
    enterStagger('#usr-stats .stat', { delay: 0.2 });
    revealOnScroll('#usr-tbody tr');
  });

  function renderStats(rows) {
    const admins = rows.filter(u => u.rol === 'Administrador').length;
    const activos = rows.filter(u => u.activo).length;
    document.getElementById('usr-stats').innerHTML = `
      <div class="stat card"><div class="stat__label">Usuarios totales</div><div class="stat__value">${rows.length}</div></div>
      <div class="stat card"><div class="stat__label">Activos</div><div class="stat__value">${activos}</div></div>
      <div class="stat card"><div class="stat__label">Administradores</div><div class="stat__value">${admins}</div></div>`;
  }

  function renderTable(rows) {
    document.getElementById('usr-count').textContent = `${rows.length} usuario${rows.length === 1 ? '' : 's'}`;
    const tbody = document.getElementById('usr-tbody');
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty">Sin resultados.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(u => `
      <tr>
        <td>${esc(u.nombre_completo)}</td>
        <td>${esc(u.email)}</td>
        <td>${badgeRol(u.rol)}</td>
        <td><span class="badge badge--${u.activo ? 'emerald' : 'crimson'}">${u.activo ? 'Sí' : 'No'}</span></td>
        <td>${esc(String(u.created_at).slice(0, 10))}</td>
      </tr>`).join('');
  }
}
