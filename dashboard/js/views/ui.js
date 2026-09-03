/* Helpers de UI compartidos por las vistas */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Badge según score de urgencia */
export function scoreBadge(score) {
  if (score >= 80) return { cls: 'crimson', label: 'Crítica' };
  if (score >= 50) return { cls: 'amber', label: 'Alta' };
  return { cls: 'emerald', label: 'Segura' };
}

/** Color por estado de lote */
export function estadoBadge(estado) {
  const map = {
    'Registrado': 'blue', 'Creado': 'blue', 'En Ruta': 'amber',
    'Recibido': 'emerald', 'Entregado': 'emerald', 'Alerta': 'crimson', 'Alerta de Manipulación': 'crimson',
  };
  return map[estado] || 'blue';
}

/** Skeleton de carga */
export function skeleton(rows = 4) {
  return `<div style="display:flex;flex-direction:column;gap:10px">${
    Array.from({ length: rows }, () => `<div class="skeleton" style="height:44px"></div>`).join('')
  }</div>`;
}

/* Control del <dialog> genérico de la app */
const appDialog = () => document.getElementById('app-dialog');
export function openDialog(html) {
  const d = appDialog();
  document.getElementById('app-dialog-content').innerHTML = html;
  if (!d.open) d.showModal();
  return d;
}
export function closeDialog() { const d = appDialog(); if (d.open) d.close(); }

/* Error consistente con el sistema de diseño, en vez de alert() nativo
   (bloquea el hilo, no respeta el tema claro/oscuro y rompe el patrón
   de <dialog> que ya usan los flujos de éxito de estas mismas vistas). */
export function showError(message, title = 'Algo salió mal') {
  openDialog(`
    <div class="dialog__header">
      <span class="brand-mark" style="background:var(--accent-crimson)">!</span>
      <div><h2>${esc(title)}</h2><p class="text-muted text-sm">${esc(message)}</p></div>
    </div>
    <div class="dialog__footer"><button class="btn btn--emerald" data-close>Entendido</button></div>`);
  document.querySelector('#app-dialog [data-close]').addEventListener('click', closeDialog);
}

/* Mismo criterio que showError: confirmaciones de éxito con el <dialog>
   de la app en vez de alert() nativo, para que noticia/historia publicadas
   se sientan parte del mismo sistema que "Lote registrado" (inventario.js)
   o "Asignar lote" (mapa.js), que ya usan openDialog(). */
export function showSuccess(message, title = 'Listo') {
  openDialog(`
    <div class="dialog__header">
      <span class="brand-mark">✓</span>
      <div><h2>${esc(title)}</h2><p class="text-muted text-sm">${esc(message)}</p></div>
    </div>
    <div class="dialog__footer"><button class="btn btn--emerald" data-close>Entendido</button></div>`);
  document.querySelector('#app-dialog [data-close]').addEventListener('click', closeDialog);
}
