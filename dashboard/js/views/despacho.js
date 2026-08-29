/* ============================================================
   Vista: Despacho de Envíos y Generación de QR
   - Selección de lote y transportista -> confirma despacho.
   - El backend (demo: Web Crypto) genera un hash SHA-256 único.
   - El hash se codifica en un QR dibujado en <canvas> nativo.
   - El QR contiene un JSON estructurado (id + hash + destino).
   - Botón "Imprimir etiqueta" abre una vista optimizada (@media print).
   ============================================================ */

import { api } from '../api.js';
import { esc, estadoBadge, openDialog, closeDialog } from './ui.js';
import { runViewAnimations, enterPanel, enterStagger } from '../animations.js';

/* Carga qrcode-generator (UMD global `qrcode`) de forma perezosa. */
let qrPromise = null;
function loadQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (qrPromise) return qrPromise;
  qrPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    s.onload = () => resolve(window.qrcode);
    s.onerror = () => reject(new Error('No se pudo cargar el generador de QR'));
    document.head.appendChild(s);
  });
  return qrPromise;
}

/** Dibuja el QR en un canvas a partir de un string. */
async function drawQR(canvas, text) {
  const qrcode = await loadQR();
  const qr = qrcode(0, 'M');           // typeNumber auto, corrección media
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = canvas.width;
  const cell = Math.floor(size / (count + 2));
  const offset = Math.floor((size - cell * count) / 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#0b1220';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
    }
  }
}

export async function mountDespacho(root) {
  root.innerHTML = `
    <div class="grid-2">
      <section class="card" id="dsp-form-card">
        <div class="section-head"><h3>Asignar ruta y despachar</h3></div>
        <form id="dsp-form" novalidate>
          <label class="field" style="margin-bottom:14px">
            <span>Lote a despachar</span>
            <select name="lote" id="dsp-lote" required><option value="">Cargando…</option></select>
          </label>
          <label class="field" style="margin-bottom:14px">
            <span>Transportista asignado</span>
            <select name="transportista" id="dsp-transportista" required><option value="">Cargando…</option></select>
          </label>
          <label class="field" style="margin-bottom:18px">
            <span>Vehículo / placa</span>
            <input name="vehiculo" required minlength="3" placeholder="MX-0000" />
          </label>
          <button type="submit" class="btn btn--blue btn--block">Confirmar despacho &amp; generar QR</button>
        </form>
      </section>

      <section class="card" id="dsp-qr-card">
        <div class="section-head"><h3>Etiqueta de trazabilidad</h3></div>
        <div id="qr-slot" class="empty">
          Confirma un despacho para generar el código QR y su etiqueta imprimible.
        </div>
      </section>
    </div>`;

  const lotes = await api.lotes();
  const disponibles = lotes.filter(l => l.estado === 'Registrado' || l.estado === 'En Ruta' || l.estado === 'Creado');
  document.getElementById('dsp-lote').innerHTML =
    `<option value="">Selecciona un lote…</option>` +
    (disponibles.length ? disponibles : lotes).map(l =>
      `<option value="${esc(l.id)}">${esc(l.id)} · ${esc(l.tipo)} → ${esc(l.comunidad)}</option>`).join('');

  // Catálogo de transportistas: GET /api/v1/usuarios solo es accesible como
  // Administrador (ver backend/README.md). Si quien despacha es un Transportista,
  // el backend no le deja consultar esa lista, así que caemos a un campo de
  // ID manual (el despacho en sí sí lo permite require_roles("Administrador","Transportista")).
  const selTransportista = document.getElementById('dsp-transportista');
  try {
    const usuarios = await api.usuarios();
    const transportistas = usuarios.filter(u => u.rol === 'Transportista' && u.activo);
    selTransportista.innerHTML = transportistas.length
      ? `<option value="">Selecciona…</option>` + transportistas.map(u =>
          `<option value="${u.id}">${esc(u.nombre_completo)} — ${esc(u.email)}</option>`).join('')
      : `<option value="">No hay transportistas activos registrados</option>`;
  } catch {
    selTransportista.outerHTML = `<input name="transportista" id="dsp-transportista" type="number" min="1"
      required placeholder="ID numérico del transportista (pídelo a un Administrador)" />`;
  }

  runViewAnimations(root, () => {
    enterPanel('#dsp-form-card', { delay: 0.05 });
    enterPanel('#dsp-qr-card', { delay: 0.12 });
  });

  document.getElementById('dsp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const loteId = fd.get('lote');
    const transportistaId = Number(fd.get('transportista'));
    const transportistaLabel = document.getElementById('dsp-transportista').tagName === 'SELECT'
      ? document.getElementById('dsp-transportista').selectedOptions[0]?.textContent || String(transportistaId)
      : `ID ${transportistaId}`;
    const vehiculo = fd.get('vehiculo').trim();
    const lote = lotes.find(l => l.id === loteId) || { id: loteId };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Despachando…';
    try {
      const res = await api.despachar(loteId, transportistaId, vehiculo);
      // Payload que la app móvil escaneará. El hash SHA-256 se firmó al
      // registrar el lote (generar_sello); el despacho no genera uno nuevo.
      const payload = JSON.stringify({ id: loteId, hash: res.hash, destino: lote.comunidad, transportista: transportistaLabel, vehiculo, t: res.despachadoEn });
      renderQR({ lote, res, payload, transportista: transportistaLabel, vehiculo });
    } catch (err) {
      alert(`No se pudo despachar el lote: ${err.message}`);
    } finally {
      btn.disabled = false; btn.textContent = 'Confirmar despacho & generar QR';
    }
  });

  function renderQR({ lote, res, payload, transportista, vehiculo }) {
    const slot = document.getElementById('qr-slot');
    slot.classList.remove('empty');
    slot.innerHTML = `
      <div class="qr-box" id="qr-box">
        <canvas id="qr-canvas" width="220" height="220" role="img" aria-label="Código QR del lote ${esc(lote.id)}"></canvas>
        <div style="text-align:center">
          <div><strong>${esc(lote.id)}</strong></div>
          <div class="text-muted text-xs">${esc(lote.tipo || '')} · <span class="badge badge--${estadoBadge('En Ruta')}">En Ruta</span></div>
        </div>
        <p class="hash" style="text-align:center">${esc(res.hash)}</p>
        <div class="dialog__footer" style="justify-content:center">
          <button class="btn btn--ghost" id="qr-json">Ver JSON</button>
          <button class="btn btn--emerald" id="qr-print">🖨 Imprimir etiqueta</button>
        </div>
      </div>`;
    drawQR(document.getElementById('qr-canvas'), payload);

    document.getElementById('qr-json').addEventListener('click', () => {
      openDialog(`<h2>Contenido del QR</h2><p class="hash" style="white-space:pre-wrap">${esc(payload)}</p>
        <div class="dialog__footer"><button class="btn btn--emerald" data-close>Cerrar</button></div>`);
      document.querySelector('#app-dialog [data-close]').addEventListener('click', closeDialog);
    });

    document.getElementById('qr-print').addEventListener('click', () =>
      printLabel({ lote, res, payload, transportista, vehiculo }));

    // Micro-animación de aparición
    enterStagger('#qr-box > *', { stagger: 0.06 });
  }
}

/* Imprime una etiqueta limpia usando @media print (nueva ventana). */
function printLabel({ lote, res, transportista, vehiculo }) {
  const w = window.open('', '_blank', 'width=460,height=640');
  if (!w) { alert('Habilita las ventanas emergentes para imprimir la etiqueta.'); return; }
  // Redibuja el QR grande dentro de la ventana de impresión
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
    <title>Etiqueta ${esc(lote.id)}</title>
    <style>
      body{font-family:'Outfit',system-ui,sans-serif;margin:0;padding:28px;color:#0b1220}
      .label{border:2px solid #0b1220;border-radius:14px;padding:24px;text-align:center}
      h1{font-size:20px;margin:0 0 4px} .muted{color:#555;font-size:13px}
      canvas{margin:14px auto;display:block}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
      td{padding:5px 0;text-align:left;border-bottom:1px solid #eee}
      .hash{font-family:monospace;font-size:10px;word-break:break-all;color:#2563eb;margin-top:10px}
      @media print{@page{margin:8mm}}
    </style></head><body>
    <div class="label">
      <h1>◈ TLAPIANI · Ayuda humanitaria</h1>
      <div class="muted">Etiqueta de trazabilidad — pegar sobre la caja</div>
      <canvas id="pc" width="260" height="260"></canvas>
      <h2 style="margin:6px 0">${esc(lote.id)}</h2>
      <table>
        <tr><td><strong>Contenido</strong></td><td>${esc(lote.tipo || '—')}</td></tr>
        <tr><td><strong>Destino</strong></td><td>${esc(lote.comunidad || '—')}</td></tr>
        <tr><td><strong>Transportista</strong></td><td>${esc(transportista)}</td></tr>
        <tr><td><strong>Vehículo</strong></td><td>${esc(vehiculo)}</td></tr>
      </table>
      <div class="hash">SHA-256: ${esc(res.hash)}</div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"><\/script>
    <script>
      window.onload=function(){
        var qr=qrcode(0,'M');qr.addData(${JSON.stringify(JSON.stringify({ id: lote.id, hash: res.hash }))});qr.make();
        var c=document.getElementById('pc'),x=c.getContext('2d'),n=qr.getModuleCount();
        var cell=Math.floor(c.width/(n+2)),off=Math.floor((c.width-cell*n)/2);
        x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#0b1220';
        for(var r=0;r<n;r++)for(var q=0;q<n;q++){if(qr.isDark(r,q))x.fillRect(off+q*cell,off+r*cell,cell,cell);}
        setTimeout(function(){window.print();},250);
      };
    <\/script>
    </body></html>`);
  w.document.close();
}
