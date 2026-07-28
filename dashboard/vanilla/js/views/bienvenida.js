/* ============================================================
   Vista: Bienvenida (banner de entrada / landing)
   Primer contacto: presenta Tlapiani y ofrece dos caminos:
   - Iniciar sesión (panel administrativo)
   - Entrar como visitante (sitio público)
   Textos redactados como borrador editable.
   ============================================================ */

import { runViewAnimations, gsap } from '../animations.js';

export async function mountBienvenida(root, { onLogin, onVisitante }) {
  root.innerHTML = `
    <div class="landing">
      <div class="landing__bg"></div>
      <div class="landing__theme">
        <button class="btn btn--ghost btn--icon" id="land-theme" type="button" aria-label="Cambiar tema">☾</button>
      </div>
      <div class="landing__inner">
        <div class="landing__badge">◈ Custodia digital de la ayuda humanitaria</div>
        <div class="landing__logo">◈</div>
        <p class="landing__tagline">TLAPIANI · náhuatl: «el que guarda y custodia»</p>
        <h1>La ayuda llega.<br><span class="accent">Y se puede comprobar.</span></h1>
        <p class="landing__lead">
          Tlapiani es un ecosistema que prioriza con inteligencia artificial a las comunidades
          más vulnerables, sella cada lote de ayuda con un hash criptográfico y permite a
          cualquier persona verificar su recorrido, de la bodega a la última milla.
        </p>
        <div class="landing__cta">
          <button class="btn btn--emerald btn--lg" id="cta-login" type="button">Iniciar sesión →</button>
          <button class="btn btn--ghost btn--lg" id="cta-visita" type="button">Entrar como visitante</button>
        </div>
        <div class="landing__meta">
          <div class="m"><b>3</b><span>capas: IA · integridad · movilidad</span></div>
          <div class="m"><b>SHA-256</b><span>pasaporte digital por lote</span></div>
          <div class="m"><b>100%</b><span>trazabilidad pública</span></div>
        </div>
      </div>
    </div>`;

  document.getElementById('cta-login').addEventListener('click', onLogin);
  document.getElementById('cta-visita').addEventListener('click', onVisitante);
  document.getElementById('land-theme').addEventListener('click', () =>
    document.getElementById('theme-toggle')?.click());

  runViewAnimations(root, () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.landing__badge', { y: 18, autoAlpha: 0, duration: 0.5 })
      .from('.landing__logo', { scale: 0.6, autoAlpha: 0, duration: 0.5 }, '-=0.25')
      .from('.landing__tagline', { y: 14, autoAlpha: 0, duration: 0.4 }, '-=0.2')
      .from('.landing h1', { y: 22, autoAlpha: 0, duration: 0.55 }, '-=0.2')
      .from('.landing__lead', { y: 18, autoAlpha: 0, duration: 0.5 }, '-=0.3')
      .from('.landing__cta .btn', { y: 16, autoAlpha: 0, duration: 0.45, stagger: 0.1 }, '-=0.25')
      .from('.landing__meta .m', { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.08 }, '-=0.2');
  });
}
