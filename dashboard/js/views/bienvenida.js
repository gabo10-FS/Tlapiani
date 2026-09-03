/* ============================================================
   Vista: Bienvenida — PRUEBA DE CONCEPTO neumorphism
   Pivote a pedido del usuario tras ver "Bitácora Náutica": superficies
   suaves con sombra dual (clara + oscura) del mismo matiz del fondo,
   feedback táctil real al presionar. Riesgo de contraste aceptado
   explícitamente por el usuario; se mitiga con un borde de 1px sutil
   (práctica común en neumorphism real) sin diluir el efecto.
   ============================================================ */

import { auth } from '../api.js?v=redesign2';
import { runViewAnimations, gsap } from '../animations.js?v=redesign3';

export async function mountBienvenida(root, { onLogin, onVisitante }) {
  const authed = auth.isAuthed();
  root.innerHTML = `
    <div class="landing">
      <div class="landing__theme">
        <button class="neu-btn" id="land-theme" type="button" aria-label="Cambiar tema" style="padding:10px;border-radius:14px">☾</button>
      </div>
      <div class="landing__inner" style="max-width:600px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:34px" class="neu-id">
          <span class="neu-stamp">TL</span>
          <div>
            <strong style="font-size:18px;letter-spacing:.02em">TLAPIANI</strong>
            <p class="text-muted text-sm" style="margin:2px 0 0">náhuatl: «el que guarda y custodia» · custodia digital de la ayuda humanitaria</p>
          </div>
        </div>
        <h1 class="neu-h1" style="font-size:clamp(32px,5.5vw,50px);line-height:1.08;max-width:12ch;margin-bottom:16px">La ayuda llega.<br>Y se puede comprobar.</h1>
        <p class="neu-sub" style="color:var(--text-muted);font-size:15.5px;line-height:1.6;max-width:56ch;margin-bottom:32px">
          Tlapiani prioriza con un algoritmo transparente y auditable a las comunidades
          más vulnerables, sella cada lote de ayuda con un hash criptográfico y permite a
          cualquier persona verificar su recorrido, de la bodega a la última milla.
        </p>
        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="neu-panel neu-card" style="padding:24px">
            <h2 style="font-size:18px;margin-bottom:8px">${authed ? 'Panel administrativo' : 'Acceso administrativo'}</h2>
            <p class="text-muted text-sm" style="margin-bottom:16px;line-height:1.55">Inventario, despacho de lotes, comunidades, usuarios y contenido público — solo para cuentas registradas.</p>
            <button class="neu-btn neu-btn--emerald" id="cta-login" type="button">${authed ? 'Ir al panel →' : 'Iniciar sesión →'}</button>
          </div>
          <div class="neu-panel neu-card" style="padding:24px">
            <h2 style="font-size:18px;margin-bottom:8px">Portal público</h2>
            <p class="text-muted text-sm" style="margin-bottom:16px;line-height:1.55">Mapa de comunidades atendidas, noticias, historias, y verificación de la cadena de custodia de cualquier lote por su ID.</p>
            <button class="neu-btn" id="cta-visita" type="button">Entrar como visitante →</button>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('cta-login').addEventListener('click', onLogin);
  document.getElementById('cta-visita').addEventListener('click', onVisitante);
  document.getElementById('land-theme').addEventListener('click', () =>
    document.getElementById('theme-toggle')?.click());

  runViewAnimations(root, () => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.neu-id', { y: 16, autoAlpha: 0, duration: 0.4 })
      .from('.neu-h1', { y: 20, autoAlpha: 0, duration: 0.5 }, '-=0.2')
      .from('.neu-sub', { y: 16, autoAlpha: 0, duration: 0.4 }, '-=0.25')
      .from('.neu-card', { y: 18, autoAlpha: 0, duration: 0.4, stagger: 0.1 }, '-=0.15');
  });
}
