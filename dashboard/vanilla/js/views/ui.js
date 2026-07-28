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
    'Registrado': 'blue', 'En Ruta': 'amber', 'Recibido': 'emerald', 'Alerta': 'crimson',
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
