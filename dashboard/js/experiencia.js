/* ============================================================
   js/experiencia.js — "Pruébalo tú": tres minijuegos que explican
   Tlapiani sin tecnicismos, uno por cada capa del sistema:

     1. Triage      — dos camiones, cuatro comunidades  (priorización)
     2. El filtro   — banda transportadora contrarreloj (integridad)
     3. Ruta segura — arma la cadena sin fugas          (trazabilidad)

   Los tres comparten la misma idea: el jugador falla primero con su
   intuición y el sistema le muestra por qué. La lección vive en la
   mecánica, no en un párrafo explicativo.

   Notas de honestidad, importantes:
   - Juego 1: los escenarios son de práctica y usan nombres FICTICIOS
     a propósito (no se le inventan índices de pobreza a municipios
     reales). El score sí se calcula con la fórmula real del backend:
     0.4·marginación + 0.4·pobreza + 0.2·emergencia.
   - Juego 2: los sellos son SHA-256 reales calculados en el navegador
     con la MISMA receta del backend (integridad_service.py::
     generar_sello): campos separados por "|", cantidad con 2
     decimales y timestamp UTC.
   - Juego 3: es una ilustración del flujo de custodia, etiquetada
     como tal; los nodos y las pruebas corresponden a los pasos que
     el sistema sí registra (sello, escaneo de QR, foto de entrega).
   ============================================================ */

import { esc } from './views/ui.js';

/* ---------- utilidades ---------- */

// Misma serialización que backend/app/services/integridad_service.py
function payloadSello({ loteId, tipoBien, cantidad, comunidadId, timestamp }) {
  return `${loteId}|${tipoBien}|${Number(cantidad).toFixed(2)}|${comunidadId}|${timestamp}`;
}

async function sha256Hex(texto) {
  const buf = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const corto = (h) => `${h.slice(0, 8)}…${h.slice(-6)}`;

/* ============================================================
   1 · TRIAGE — "Tienes dos camiones. ¿A dónde los mandas?"
   ------------------------------------------------------------
   Cuatro comunidades piden ayuda al mismo tiempo y solo alcanza
   para dos. El jugador asigna los camiones; al confirmar, el
   sistema revela su score y casi siempre no coinciden.

   Por qué falla la intuición: lo primero que salta a la vista es
   el TAMAÑO del pueblo ("ahí ayudo a más gente"), y la población
   NO entra en la fórmula. Lo que entra es qué tan marginada y
   empobrecida está la comunidad, y si trae una emergencia activa.

   El score se calcula aquí con la MISMA fórmula del backend
   (app/services/prioridad_service.py):
       SU = 0.4·marginación + 0.4·pobreza + 0.2·emergencia
   Los escenarios son de práctica y usan nombres ficticios a
   propósito: no se le inventan índices a municipios reales.
   ============================================================ */
const PESOS = { marginacion: 0.4, pobreza: 0.4, emergencia: 0.2 };

const scoreDe = (c) =>
  Math.round(
    PESOS.marginacion * c.marginacion +
    PESOS.pobreza * c.pobreza +
    PESOS.emergencia * c.emergencia
  );

// Cada escenario está armado para que el pueblo grande y cómodo
// NO sea el prioritario. Posiciones en % dentro del mapa.
const ESCENARIOS = [
  [
    { n: 'Villa Progreso', pob: 12400, marginacion: 34, pobreza: 30, emergencia: 0,  x: 24, y: 30, nota: 'Cabecera municipal, carretera pavimentada' },
    { n: 'Rancho El Sauz', pob: 890,   marginacion: 78, pobreza: 82, emergencia: 90, x: 68, y: 22, nota: 'Camino de terracería cortado por un deslave' },
    { n: 'San Isidro',     pob: 4100,  marginacion: 55, pobreza: 51, emergencia: 20, x: 40, y: 66, nota: 'Acceso regular' },
    { n: 'Loma Tepetate',  pob: 620,   marginacion: 71, pobreza: 74, emergencia: 15, x: 76, y: 70, nota: 'Sierra alta, sin señal' },
  ],
  [
    { n: 'Ciudad Nopala',  pob: 21000, marginacion: 28, pobreza: 26, emergencia: 10, x: 30, y: 24, nota: 'Zona urbana con servicios' },
    { n: 'Arroyo Hondo',   pob: 1350,  marginacion: 69, pobreza: 73, emergencia: 75, x: 70, y: 34, nota: 'Río desbordado, puente cerrado' },
    { n: 'Santa Cruz',     pob: 7800,  marginacion: 44, pobreza: 40, emergencia: 5,  x: 22, y: 68, nota: 'A media hora de la capital' },
    { n: 'El Mirador',     pob: 430,   marginacion: 81, pobreza: 79, emergencia: 25, x: 62, y: 72, nota: 'Comunidad aislada en la sierra' },
  ],
];

const SVG_CAMION = `<svg viewBox="0 0 40 24" fill="none" aria-hidden="true">
  <path d="M2 5h18v13H2z" fill="currentColor" opacity=".9"/>
  <path d="M20 9h8l5 5v4h-13z" fill="currentColor" opacity=".65"/>
  <circle cx="9" cy="19.5" r="3.2" fill="currentColor"/>
  <circle cx="27" cy="19.5" r="3.2" fill="currentColor"/>
</svg>`;

function actividadPrioridad(panel) {
  let escenario = 0;
  const CAMIONES = 2;

  function pintar() {
    const com = ESCENARIOS[escenario % ESCENARIOS.length];
    const elegidas = new Set();

    panel.innerHTML = `
      <p class="xp-pregunta">Cuatro comunidades piden ayuda al mismo tiempo y solo tienes
      <strong>dos camiones</strong>. ¿A dónde los mandas?</p>

      <div class="tri-flota" aria-live="polite">
        <span class="tri-flota__l">Camiones disponibles</span>
        <div class="tri-camiones">
          ${Array.from({ length: CAMIONES }, (_, i) =>
            `<span class="tri-camion" data-camion="${i}" draggable="true">${SVG_CAMION}</span>`).join('')}
        </div>
      </div>

      <div class="tri-mapa" id="tri-mapa">
        <span class="tri-mapa__l">Escenario de práctica</span>
        ${com.map((c, i) => {
          // El radio comunica población: es la pista que engaña.
          const r = 22 + Math.round(Math.sqrt(c.pob) / 6);
          return `
          <button class="tri-com" type="button" data-i="${i}"
                  style="left:${c.x}%; top:${c.y}%; --r:${r}px"
                  aria-label="${esc(c.n)}, población ${c.pob}">
            <span class="tri-pulso" aria-hidden="true"></span>
            <span class="tri-punto"></span>
            <span class="tri-etiqueta">
              <strong>${esc(c.n)}</strong>
              <span>${c.pob.toLocaleString('es-MX')} hab.</span>
            </span>
            <span class="tri-asignado" hidden>${SVG_CAMION}</span>
          </button>`;
        }).join('')}
      </div>

      <p class="text-muted text-sm tri-ayuda">Toca una comunidad para mandarle un camión (o arrastra uno).
      Puedes cambiar de opinión antes de confirmar.</p>

      <div class="tri-acciones">
        <button class="btn btn--emerald tri-ok" type="button" disabled>Confirmar envío</button>
      </div>
      <div class="xp-reveal" hidden></div>`;

    const mapa = panel.querySelector('#tri-mapa');
    const btnOk = panel.querySelector('.tri-ok');

    function refrescar() {
      panel.querySelectorAll('.tri-com').forEach(b => {
        const on = elegidas.has(Number(b.dataset.i));
        b.classList.toggle('is-on', on);
        b.querySelector('.tri-asignado').hidden = !on;
      });
      panel.querySelectorAll('.tri-camion').forEach((t, i) => {
        t.classList.toggle('is-usado', i < elegidas.size);
      });
      btnOk.disabled = elegidas.size !== CAMIONES;
      btnOk.textContent = elegidas.size === CAMIONES
        ? 'Confirmar envío'
        : `Elige ${CAMIONES - elegidas.size} más`;
    }

    function alternar(i) {
      if (elegidas.has(i)) elegidas.delete(i);
      else if (elegidas.size < CAMIONES) elegidas.add(i);
      refrescar();
    }

    panel.querySelectorAll('.tri-com').forEach(b => {
      b.addEventListener('click', () => alternar(Number(b.dataset.i)));
      // Soltar un camión encima también asigna.
      b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('is-over'); });
      b.addEventListener('dragleave', () => b.classList.remove('is-over'));
      b.addEventListener('drop', e => {
        e.preventDefault(); b.classList.remove('is-over');
        const i = Number(b.dataset.i);
        if (!elegidas.has(i)) alternar(i);
      });
    });
    panel.querySelectorAll('.tri-camion').forEach(t => {
      t.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', 'camion'));
    });

    btnOk.addEventListener('click', () => revelar(com, elegidas));
    refrescar();
  }

  function revelar(com, elegidas) {
    const conScore = com.map((c, i) => ({ ...c, i, score: scoreDe(c) }));
    const orden = [...conScore].sort((a, b) => b.score - a.score);
    const top = new Set(orden.slice(0, 2).map(c => c.i));
    const coincidencias = [...elegidas].filter(i => top.has(i)).length;

    // El pueblo más grande que el jugador eligió pero el sistema no:
    const falloGrande = [...elegidas]
      .map(i => conScore[i])
      .filter(c => !top.has(c.i))
      .sort((a, b) => b.pob - a.pob)[0];
    const perdida = orden.find(c => top.has(c.i) && !elegidas.has(c.i));

    panel.querySelectorAll('.tri-com').forEach(b => {
      const i = Number(b.dataset.i);
      b.disabled = true;
      b.classList.add(top.has(i) ? 'is-top' : 'is-low');
      const et = b.querySelector('.tri-etiqueta');
      et.insertAdjacentHTML('beforeend', `<span class="tri-score">${conScore[i].score}</span>`);
    });
    panel.querySelector('.tri-acciones').hidden = true;
    panel.querySelector('.tri-ayuda').hidden = true;

    const veredicto = coincidencias === 2
      ? 'Coincidiste con el sistema en los dos.'
      : coincidencias === 1
        ? 'Acertaste uno de los dos.'
        : 'El sistema habría mandado los camiones a otras dos.';

    const rev = panel.querySelector('.xp-reveal');
    rev.hidden = false;
    rev.innerHTML = `
      <p class="xp-veredicto ${coincidencias === 2 ? 'ok' : 'no'}">${veredicto}</p>
      ${falloGrande && perdida ? `
        <p class="tri-explica">
          Mandaste un camión a <strong>${esc(falloGrande.n)}</strong>
          (${falloGrande.pob.toLocaleString('es-MX')} hab.) y el sistema lo habría mandado a
          <strong>${esc(perdida.n)}</strong> (${perdida.pob.toLocaleString('es-MX')} hab.).
          Es contraintuitivo, y ahí está el punto: <strong>el tamaño del pueblo no entra en la
          fórmula</strong>. Lo que pesa es qué tan marginada y empobrecida está la comunidad,
          y si trae una emergencia encima.
        </p>` : ``}
      <div class="tri-tabla">
        ${orden.map(c => `
          <div class="tri-fila ${top.has(c.i) ? 'top' : ''} ${elegidas.has(c.i) ? 'mia' : ''}">
            <div class="tri-fila__id">
              <strong>${esc(c.n)}</strong>
              <span class="text-muted text-sm">${esc(c.nota)}</span>
            </div>
            <div class="tri-fila__ind">
              <span title="Índice de marginación">Marg. ${c.marginacion}</span>
              <span title="Índice de pobreza">Pobreza ${c.pobreza}</span>
              <span title="Coeficiente de emergencia" class="${c.emergencia >= 60 ? 'alto' : ''}">Emerg. ${c.emergencia}</span>
            </div>
            <div class="tri-fila__score">
              <div class="xp-barra__riel"><span style="width:${Math.max(4, c.score)}%"></span></div>
              <strong>${c.score}</strong>
            </div>
            ${elegidas.has(c.i) ? `<span class="tri-tag mia">tu elección</span>` : ``}
            ${top.has(c.i) ? `<span class="tri-tag sis">prioridad del sistema</span>` : ``}
          </div>`).join('')}
      </div>
      <p class="text-muted text-sm xp-nota">
        Ese número sale de la fórmula real del sistema:
        <strong>40% marginación + 40% pobreza + 20% emergencia</strong>. Nadie la ajusta a mano por
        comunidad, y por eso una localidad chica y aislada puede pasar antes que una cabecera grande.
        Escenario de práctica con nombres ficticios; en el mapa de arriba los datos sí son reales.
      </p>
      <button class="btn btn--ghost btn--sm xp-otra" type="button">Otro escenario</button>`;

    rev.querySelector('.xp-otra').addEventListener('click', () => { escenario++; pintar(); });
  }

  pintar();
}

/* ============================================================
   2 · EL FILTRO — minijuego de banda transportadora
   ------------------------------------------------------------
   La lección vive dentro de la mecánica, no en un texto:

     Ronda 1 "a ojo"      -> no se ve el sello. Es adivinar; la
                             precisión se va al ~50%.
     Ronda 2 "con sello"  -> el mismo juego, pero cada paquete llega
                             con su sello verificado. Se puede acertar
                             todo.

   La diferencia entre los dos marcadores del jugador ES el argumento
   del proyecto. Los sellos son SHA-256 reales calculados en el
   navegador con la receta del backend (ver payloadSello arriba).
   ============================================================ */
const JUEGO_CATALOGO = [
  { tipo: 'Despensa básica', cant: 250, unidad: 'kg', destino: 'Cochoapa el Grande', cid: 6 },
  { tipo: 'Agua embotellada', cant: 600, unidad: 'L', destino: 'San Juan Chamula', cid: 1 },
  { tipo: 'Cobijas térmicas', cant: 180, unidad: 'pzs', destino: 'Metlatónoc', cid: 4 },
  { tipo: 'Kit médico', cant: 90, unidad: 'kits', destino: 'Santa María Tlahuitoltepec', cid: 2 },
  { tipo: 'Láminas de zinc', cant: 120, unidad: 'pzs', destino: 'Coicoyán de las Flores', cid: 3 },
  { tipo: 'Despensa infantil', cant: 300, unidad: 'kg', destino: 'Batopilas', cid: 5 },
];

const PAQUETES_POR_RONDA = 6;
const SEGUNDOS_POR_PAQUETE = 5;

// Caja dibujada en SVG: nada de emojis (se ven distinto en cada
// sistema) y escala sin pixelarse.
const SVG_CAJA = `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <path d="M6 16.5 24 8l18 8.5v15L24 40 6 31.5v-15Z" fill="currentColor" opacity=".14"/>
  <path d="M6 16.5 24 8l18 8.5-18 8.5-18-8.5Z" fill="currentColor" opacity=".3"/>
  <path d="M6 16.5 24 25v15L6 31.5v-15ZM42 16.5 24 25v15l18-8.5v-15Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M6 16.5 24 8l18 8.5-18 8.5-18-8.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;

function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function armarRonda() {
  const base = barajar(JUEGO_CATALOGO).slice(0, PAQUETES_POR_RONDA);
  // Entre 2 y 3 alterados por ronda, en posiciones al azar.
  const cuantos = 2 + Math.floor(Math.random() * 2);
  const alterados = new Set(barajar([...base.keys()]).slice(0, cuantos));

  return Promise.all(base.map(async (b, i) => {
    const loteId = `TLAP-2026-${String(1000 + Math.floor(Math.random() * 8999))}`;
    const timestamp = '2026-08-14T09:30:00Z';
    // Lo que se selló en el origen:
    const origen = { loteId, tipoBien: b.tipo, cantidad: b.cant, comunidadId: b.cid, timestamp };
    const selloOrigen = await sha256Hex(payloadSello(origen));

    const manipulado = alterados.has(i);
    // Si lo manipularon, el contenido real ya no es el sellado.
    const real = manipulado
      ? { ...origen, cantidad: Math.round(b.cant * (0.5 + Math.random() * 0.25)) }
      : origen;
    const selloRecalculado = await sha256Hex(payloadSello(real));

    return {
      ...b, loteId, manipulado,
      // El paquete DECLARA la cantidad original (por eso a ojo no se nota).
      declara: b.cant,
      selloOrigen, selloRecalculado,
    };
  }));
}

function actividadJuego(panel) {
  let ronda = 1;            // 1 = a ojo, 2 = con sello
  let idx = 0;
  let paquetes = [];
  let aciertos = [0, 0];    // [ronda1, ronda2]
  let rafId = 0;
  let tInicio = 0;
  let respondido = false;
  let resultados = [];

  function detener() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  function intro() {
    detener();
    panel.innerHTML = `
      <div class="jz-intro">
        <span class="jz-ronda">Ronda 1 de 2</span>
        <h4>Tú eres el filtro</h4>
        <p class="text-muted">
          Van a pasar ${PAQUETES_POR_RONDA} paquetes por la banda. Algunos fueron alterados en el camino.
          Tienes ${SEGUNDOS_POR_PAQUETE} segundos para decidir cuáles dejas pasar. Solo con lo que ves.
        </p>
        <button class="btn btn--emerald jz-start" type="button">Empezar</button>
      </div>`;
    panel.querySelector('.jz-start').addEventListener('click', arrancarRonda);
  }

  // Arranca la ronda directo, sin pantalla intermedia: al terminar la
  // ronda 1 el resumen ya explica qué cambia, así que meter otro
  // "listo para empezar" solo agregaba un clic de más.
  async function arrancarRonda() {
    detener();
    panel.innerHTML = `<p class="text-muted jz-cargando">Preparando la banda…</p>`;
    paquetes = await armarRonda();
    idx = 0; resultados = [];
    siguiente();
  }

  function siguiente() {
    detener();
    if (idx >= paquetes.length) return finRonda();
    respondido = false;
    const p = paquetes[idx];
    const conSello = ronda === 2;

    panel.innerHTML = `
      <div class="jz">
        <div class="jz-hud">
          <span class="jz-ronda">Ronda ${ronda} · ${conSello ? 'con sello' : 'a ojo'}</span>
          <span class="jz-progreso">${idx + 1} / ${paquetes.length}</span>
          <span class="jz-marcador">${aciertos[ronda - 1]} aciertos</span>
        </div>

        <div class="jz-banda">
          <div class="jz-belt" aria-hidden="true"></div>
          <article class="jz-caja">
            <div class="jz-caja__ico">${SVG_CAJA}</div>
            <div class="jz-caja__datos">
              <strong>${esc(p.tipo)}</strong>
              <span class="text-muted text-sm">${p.declara} ${esc(p.unidad)} · ${esc(p.destino)}</span>
              <code class="jz-folio">${esc(p.loteId)}</code>
            </div>
            ${conSello ? `
              <div class="jz-sello ${p.manipulado ? 'bad' : 'ok'}">
                <span class="jz-sello__l">Sello de origen</span>
                <code>${corto(p.selloOrigen)}</code>
                <span class="jz-sello__op">${p.manipulado ? '≠' : '='}</span>
                <code>${corto(p.selloRecalculado)}</code>
                <span class="jz-sello__l">Sello al llegar</span>
              </div>` : `
              <div class="jz-sello neutro">
                <span class="jz-sello__l">Sin verificación disponible</span>
              </div>`}
          </article>
        </div>

        <div class="jz-tiempo"><span class="jz-tiempo__barra"></span></div>

        <div class="jz-acciones">
          <button class="btn jz-btn jz-no" type="button" data-act="detener">Detener</button>
          <button class="btn btn--emerald jz-btn jz-si" type="button" data-act="pasar">Dejar pasar</button>
        </div>
      </div>`;

    panel.querySelectorAll('[data-act]').forEach(b => {
      b.addEventListener('click', () => responder(b.dataset.act === 'pasar'));
    });

    // Cronómetro visual. Si se acaba el tiempo, el paquete pasa solo
    // (es lo que ocurre en la vida real cuando nadie alcanza a revisar).
    const barra = panel.querySelector('.jz-tiempo__barra');
    tInicio = performance.now();
    const dur = SEGUNDOS_POR_PAQUETE * 1000;
    (function tick(now) {
      if (respondido || !panel.isConnected) return;
      const t = Math.min(1, (now - tInicio) / dur);
      if (barra) barra.style.width = `${(1 - t) * 100}%`;
      if (t >= 1) return responder(true, true);
      rafId = requestAnimationFrame(tick);
    })(performance.now());
  }

  function responder(dejaPasar, porTiempo = false) {
    if (respondido) return;
    respondido = true;
    detener();

    const p = paquetes[idx];
    // Acierto = detener lo manipulado, dejar pasar lo íntegro.
    const bien = p.manipulado ? !dejaPasar : dejaPasar;
    if (bien) aciertos[ronda - 1]++;
    resultados.push({ ...p, dejaPasar, bien, porTiempo });

    const caja = panel.querySelector('.jz-caja');
    if (caja) {
      caja.classList.add(bien ? 'sale-ok' : 'sale-mal');
      const marca = document.createElement('div');
      marca.className = `jz-marca ${bien ? 'ok' : 'mal'}`;
      marca.textContent = bien ? 'Correcto' : (p.manipulado ? 'Se te fue uno alterado' : 'Detuviste uno bueno');
      caja.appendChild(marca);
    }
    const hud = panel.querySelector('.jz-marcador');
    if (hud) hud.textContent = `${aciertos[ronda - 1]} aciertos`;

    setTimeout(() => { idx++; siguiente(); }, 900);
  }

  function finRonda() {
    const total = paquetes.length;
    const pct = Math.round((aciertos[ronda - 1] / total) * 100);

    if (ronda === 1) {
      panel.innerHTML = `
        <div class="jz-intro">
          <span class="jz-ronda">Fin de la ronda 1</span>
          <h4>${aciertos[0]} de ${total} correctos (${pct}%)</h4>
          <p class="text-muted">
            No es culpa tuya: los paquetes alterados <strong>declaraban la cantidad original</strong>,
            así que a simple vista eran idénticos a los buenos. Nadie puede con esto a ojo.
            Ahora lo mismo, pero cada paquete llega con su <strong>sello verificado</strong>:
            compara la huella del origen con la del paquete que llegó.
          </p>
          <button class="btn btn--emerald jz-start" type="button">Jugar ronda 2 · con sello</button>
        </div>`;
      panel.querySelector('.jz-start').addEventListener('click', () => { ronda = 2; arrancarRonda(); });
      return;
    }

    // Cierre: comparación de las dos rondas.
    const p1 = Math.round((aciertos[0] / total) * 100);
    const p2 = Math.round((aciertos[1] / total) * 100);
    panel.innerHTML = `
      <div class="jz-final">
        <span class="jz-ronda">Resultado</span>
        <h4>${p2 > p1 ? 'Esa diferencia es Tlapiani' : 'Así se ve la diferencia'}</h4>
        <div class="xp-barras">
          <div class="xp-barra">
            <div class="xp-barra__top"><span>Ronda 1 · a ojo</span><strong>${p1}%</strong></div>
            <div class="xp-barra__riel"><span class="riel-gris" style="width:${Math.max(3, p1)}%"></span></div>
          </div>
          <div class="xp-barra">
            <div class="xp-barra__top"><span>Ronda 2 · con sello</span><strong>${p2}%</strong></div>
            <div class="xp-barra__riel"><span style="width:${Math.max(3, p2)}%"></span></div>
          </div>
        </div>
        <p class="text-muted text-sm xp-nota">
          Cada paquete se selló de verdad aquí en tu navegador con SHA-256, la misma receta que usa
          el sistema. Cambiar un solo dato —250 kg por 180, por ejemplo— transforma la huella entera,
          y no existe forma de alterar el contenido dejando la huella igual. Por eso el desvío no se
          puede esconder: no depende de que alguien esté atento, depende de la matemática.
        </p>
        <div class="xp-paso-acciones">
          <button class="btn btn--emerald btn--sm jz-reiniciar" type="button">Jugar otra vez</button>
          <a class="btn btn--ghost btn--sm" href="#/transparencia">Verificar un lote real</a>
        </div>
      </div>`;
    panel.querySelector('.jz-reiniciar').addEventListener('click', () => {
      ronda = 1; aciertos = [0, 0]; intro();
    });
  }

  intro();
}

/* ============================================================
   3 · RUTA SEGURA — arma la cadena y suelta el donativo
   ------------------------------------------------------------
   Estilo "tubería": el donativo tiene que llegar del Donante al
   Beneficiario pasando por tres nodos de validación (Almacén,
   Transporte, Entrega). Cada nodo necesita una PRUEBA para
   quedar enclavado.

   El giro: si en algún nodo se pone una prueba débil (una promesa,
   una nota en papel), el flujo llega ahí y se fuga -- el donativo
   se pierde justo donde no había evidencia. Con la prueba correcta
   el nodo se enclava y el donativo no avanza sin la evidencia del
   paso anterior. Eso es exactamente lo que hace la cadena de
   custodia del sistema.
   ============================================================ */
const NODOS = [
  { id: 'almacen',   t: 'Almacén',    sub: 'Entra al centro de acopio' },
  { id: 'transporte',t: 'Transporte', sub: 'Sale a la comunidad' },
  { id: 'entrega',   t: 'Entrega',    sub: 'Llega a manos de la gente' },
];

// 3 pruebas válidas (una por nodo) + 3 señuelos que "suenan bien".
const PRUEBAS = [
  { id: 'sello',   nodo: 'almacen',    t: 'Sello SHA-256',        ok: true,  d: 'Huella única del lote al registrarse.' },
  { id: 'qr',      nodo: 'transporte', t: 'Escaneo del QR',       ok: true,  d: 'Transportista y vehículo quedan en la bitácora.' },
  { id: 'foto',    nodo: 'entrega',    t: 'Foto de entrega',      ok: true,  d: 'Evidencia verificable en la comunidad.' },
  { id: 'palabra', nodo: null,         t: 'Promesa verbal',       ok: false, d: '"Yo me encargo, confía en mí."' },
  { id: 'papel',   nodo: null,         t: 'Nota en papel',        ok: false, d: 'Se pierde, se moja, se rehace.' },
  { id: 'excel',   nodo: null,         t: 'Excel sin respaldo',   ok: false, d: 'Cualquiera lo edita después.' },
];

const SVG_PERSONA = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="8" r="4" fill="currentColor" opacity=".85"/>
  <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" opacity=".5"/></svg>`;
const SVG_CANDADO = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor" opacity=".85"/>
  <path d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

function actividadRuta(panel) {
  let asignado = {};      // nodoId -> pruebaId
  let seleccion = null;   // prueba levantada de la bandeja

  function pintar() {
    panel.innerHTML = `
      <p class="xp-pregunta">Arma la cadena: cada nodo necesita una <strong>prueba</strong> para
      quedar enclavado. Luego suelta el donativo y mira si llega.</p>

      <div class="rs-linea" id="rs-linea">
        <div class="rs-extremo">
          <span class="rs-ico">${SVG_PERSONA}</span>
          <span class="rs-extremo__t">Donante</span>
        </div>
        ${NODOS.map(n => `
          <div class="rs-tramo" data-tramo="${n.id}"><span class="rs-flujo"></span></div>
          <button class="rs-nodo" type="button" data-nodo="${n.id}">
            <span class="rs-nodo__t">${n.t}</span>
            <span class="rs-nodo__sub">${n.sub}</span>
            <span class="rs-slot">Falta prueba</span>
          </button>`).join('')}
        <div class="rs-tramo" data-tramo="final"><span class="rs-flujo"></span></div>
        <div class="rs-extremo">
          <span class="rs-ico">${SVG_PERSONA}</span>
          <span class="rs-extremo__t">Beneficiario</span>
        </div>
      </div>

      <div class="rs-bandeja">
        <span class="rs-bandeja__l">Pruebas disponibles</span>
        <div class="rs-chips">
          ${PRUEBAS.map(p => `
            <button class="rs-chip" type="button" data-prueba="${p.id}">
              <strong>${p.t}</strong><span class="text-muted text-sm">${p.d}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="tri-acciones">
        <button class="btn btn--emerald rs-go" type="button" disabled>Soltar el donativo</button>
      </div>
      <div class="xp-reveal" hidden></div>`;

    panel.querySelectorAll('.rs-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        seleccion = seleccion === ch.dataset.prueba ? null : ch.dataset.prueba;
        panel.querySelectorAll('.rs-chip').forEach(c =>
          c.classList.toggle('is-sel', c.dataset.prueba === seleccion));
      });
    });

    panel.querySelectorAll('.rs-nodo').forEach(nd => {
      nd.addEventListener('click', () => {
        const id = nd.dataset.nodo;
        if (asignado[id]) {           // segundo toque: liberar
          delete asignado[id];
        } else if (seleccion) {
          // una prueba no puede estar en dos nodos a la vez
          Object.keys(asignado).forEach(k => { if (asignado[k] === seleccion) delete asignado[k]; });
          asignado[id] = seleccion;
          seleccion = null;
        }
        refrescar();
      });
    });

    panel.querySelector('.rs-go').addEventListener('click', soltar);
    refrescar();
  }

  function refrescar() {
    const usadas = new Set(Object.values(asignado));
    panel.querySelectorAll('.rs-chip').forEach(c => {
      c.classList.toggle('is-sel', c.dataset.prueba === seleccion);
      c.classList.toggle('is-usada', usadas.has(c.dataset.prueba));
    });
    panel.querySelectorAll('.rs-nodo').forEach(nd => {
      const pid = asignado[nd.dataset.nodo];
      const p = PRUEBAS.find(x => x.id === pid);
      const slot = nd.querySelector('.rs-slot');
      nd.classList.toggle('is-lleno', !!p);
      slot.textContent = p ? p.t : 'Falta prueba';
    });
    const listo = NODOS.every(n => asignado[n.id]);
    const go = panel.querySelector('.rs-go');
    go.disabled = !listo;
    go.textContent = listo ? 'Soltar el donativo' : 'Coloca una prueba en cada nodo';
  }

  async function soltar() {
    panel.querySelector('.rs-go').disabled = true;
    panel.querySelectorAll('.rs-chip').forEach(c => c.disabled = true);
    panel.querySelectorAll('.rs-nodo').forEach(n => n.disabled = true);

    // Primer nodo cuya prueba no sirve para ese paso.
    const fallaEn = NODOS.findIndex(n => {
      const p = PRUEBAS.find(x => x.id === asignado[n.id]);
      return !p || !p.ok || p.nodo !== n.id;
    });

    const tramos = [...panel.querySelectorAll('.rs-tramo')];
    const nodos = [...panel.querySelectorAll('.rs-nodo')];
    const hasta = fallaEn === -1 ? NODOS.length : fallaEn;

    const esperar = (ms) => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i <= hasta; i++) {
      if (!panel.isConnected) return;
      tramos[i]?.classList.add('fluye');
      await esperar(520);
      if (i < hasta) {
        nodos[i]?.classList.add('is-ok');
        nodos[i]?.insertAdjacentHTML('beforeend', `<span class="rs-candado">${SVG_CANDADO}</span>`);
        await esperar(260);
      }
    }

    if (fallaEn === -1) {
      tramos[NODOS.length]?.classList.add('fluye');
      await esperar(500);
      panel.querySelector('.rs-linea')?.classList.add('completa');
      exito();
    } else {
      nodos[fallaEn]?.classList.add('is-fuga');
      tramos[fallaEn]?.classList.add('fuga');
      fuga(fallaEn);
    }
  }

  function fuga(i) {
    const n = NODOS[i];
    const p = PRUEBAS.find(x => x.id === asignado[n.id]);
    const correcta = PRUEBAS.find(x => x.nodo === n.id);
    const rev = panel.querySelector('.xp-reveal');
    rev.hidden = false;
    rev.innerHTML = `
      <p class="xp-veredicto no">El donativo se fugó en «${n.t}».</p>
      <p class="tri-explica">
        Ahí pusiste <strong>${esc(p.t)}</strong>${p.ok ? ' — es una prueba válida, pero de otro paso' : ''}.
        ${p.ok
          ? `Cada nodo pide la evidencia que le toca; para este paso es <strong>${esc(correcta.t)}</strong>.`
          : `Eso no es evidencia: no se puede verificar después, y cuando algo se pierde no queda rastro
             de dónde. Para este paso hace falta <strong>${esc(correcta.t)}</strong>.`}
      </p>
      <p class="text-muted text-sm xp-nota">
        Así se pierde la ayuda en la vida real: no por un gran robo, sino por un eslabón sin evidencia.
        En Tlapiani el lote no avanza al siguiente paso sin la prueba del anterior — por eso el
        recorrido se puede auditar completo y se ve exactamente dónde se rompió.
      </p>
      <button class="btn btn--emerald btn--sm xp-otra" type="button">Volver a intentar</button>`;
    rev.querySelector('.xp-otra').addEventListener('click', () => { asignado = {}; seleccion = null; pintar(); });
  }

  function exito() {
    const rev = panel.querySelector('.xp-reveal');
    rev.hidden = false;
    rev.innerHTML = `
      <p class="xp-veredicto ok">Llegó completo, y con evidencia en cada paso.</p>
      <p class="tri-explica">
        Los tres nodos quedaron enclavados: sello al registrarse, escaneo del QR al salir y foto al
        entregar. Ninguno se abre sin el anterior.
      </p>
      <p class="text-muted text-sm xp-nota">
        Eso es la cadena de custodia: cualquiera puede recorrerla después con el folio del lote y ver
        las tres pruebas. Si faltara una, el recorrido lo mostraría en vez de esconderlo.
      </p>
      <div class="xp-paso-acciones">
        <a class="btn btn--emerald btn--sm" href="#/transparencia">Ver un recorrido real</a>
        <button class="btn btn--ghost btn--sm xp-otra" type="button">Jugar otra vez</button>
      </div>`;
    rev.querySelector('.xp-otra').addEventListener('click', () => { asignado = {}; seleccion = null; pintar(); });
  }

  pintar();
}

/* ============================================================
   Montaje de la sección completa
   ============================================================ */
const ACTIVIDADES = [
  { id: 'prioridad', tab: 'Triage: dos camiones', capa: 'Priorización' },
  { id: 'sello', tab: 'El filtro (minijuego)', capa: 'Integridad' },
  { id: 'ruta', tab: 'Ruta segura', capa: 'Trazabilidad' },
];

export function renderExperiencia(root, comunidades) {
  if (!root) return;
  root.innerHTML = `
    <div class="xp-tabs" role="tablist" aria-label="Ejercicios">
      ${ACTIVIDADES.map((a, i) => `
        <button class="xp-tab ${i === 0 ? 'is-active' : ''}" type="button" role="tab"
                aria-selected="${i === 0}" data-xp="${a.id}">
          <span class="xp-tab__n">${i + 1}</span>
          <span class="xp-tab__txt"><strong>${a.tab}</strong><span>${a.capa}</span></span>
        </button>`).join('')}
    </div>
    <div class="xp-body">
      ${ACTIVIDADES.map((a, i) => `<div class="xp-panel ${i === 0 ? 'is-active' : ''}" data-xp-panel="${a.id}"></div>`).join('')}
    </div>`;

  const montar = {
    prioridad: (el) => actividadPrioridad(el),
    sello: (el) => actividadJuego(el),
    ruta: (el) => actividadRuta(el),
  };
  const montados = new Set();

  function activar(id) {
    root.querySelectorAll('.xp-tab').forEach(t => {
      const on = t.dataset.xp === id;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    root.querySelectorAll('.xp-panel').forEach(p => {
      p.classList.toggle('is-active', p.dataset.xpPanel === id);
    });
    if (!montados.has(id)) {
      montar[id](root.querySelector(`[data-xp-panel="${id}"]`));
      montados.add(id);
    }
  }

  root.querySelectorAll('.xp-tab').forEach(t => {
    t.addEventListener('click', () => activar(t.dataset.xp));
  });

  activar('prioridad');
}
