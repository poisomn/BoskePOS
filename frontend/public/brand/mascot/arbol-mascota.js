/* <arbol-mascota> â€” Web Component sin dependencias. Ver README.md.
   Uso: <script src="arbol-mascota.js"></script>  <arbol-mascota estado="login" size="240"></arbol-mascota> */
(function () {
  const SRC_DEFAULT = new URL('mascota.png', (document.currentScript && document.currentScript.src) || location.href).href;
  const ESTADOS = ['reposo', 'login', 'cargando', 'error', 'exito', 'inactivo'];
  const BASE = { y: 0, x: 0, sx: 1, sy: 1, rot: 0, lo: 1, ro: 1, la: 0, ra: 0, lx: 0, rx: 0, ex: 0, ey: 0, mc: 70, mw: 70, n1: 0, n2: 0, n3: 0, er: 0, sp: 0, zz: 0 };
  const bump = (p, a, b) => (p < a || p > b ? 0 : Math.sin(((p - a) / (b - a)) * Math.PI));
  const c01 = (n) => Math.max(0, Math.min(1, n));

  // t = segundos desde que empezÃ³ el estado
  function objetivo(estado, t) {
    const d = { ...BASE }, bob = Math.sin(t * 2.2);
    if (estado === 'reposo') {
      const b = bump(t % 2.6, 2.3, 2.6);
      Object.assign(d, { y: bob * 8, sy: 1 + bob * 0.012, sx: 1 - bob * 0.008, lo: 1 - b * 0.95, ro: 1 - b * 0.95, ex: Math.sin(t * 0.9) * 6 });
    } else if (estado === 'login') {
      const w = c01(bump(t % 3, 0.5, 1.5) * 1.5);
      Object.assign(d, { y: bob * 7, rot: w * 3, ro: 1 - w, ra: w, mc: 90, mw: 80, sp: w > 0.5 ? (w - 0.5) * 2 : 0, sy: 1 + bob * 0.01 });
    } else if (estado === 'cargando') {
      const s = t * 4.5;
      Object.assign(d, { y: -Math.abs(Math.sin(t * 3)) * 14, sy: 1 + Math.sin(t * 6) * 0.015, ex: Math.sin(t * 2.2) * 16, ey: Math.cos(t * 2.2) * 5, mc: 10, mw: 40, n1: Math.max(0, Math.sin(s)), n3: Math.max(0, Math.sin(s - 1.1)), n2: Math.max(0, Math.sin(s - 2.2)) });
    } else if (estado === 'error') {
      const sh = Math.max(0, 1 - t / 0.8);
      Object.assign(d, { x: Math.sin(t * 45) * 20 * sh, rot: -2 + Math.sin(t * 1.5), lo: 0, ro: 0, lx: 1, rx: 1, mc: -80, mw: 55, er: 1, y: 6 + Math.sin(t * 2) * 3, sy: 0.97 });
    } else if (estado === 'exito') {
      const j = Math.abs(Math.sin(t * 4.2));
      Object.assign(d, { y: -j * 90, sy: 1 + j * 0.06 - (1 - j) * 0.08, sx: 1 - j * 0.04 + (1 - j) * 0.06, la: 1, ra: 1, lo: 0, ro: 0, mc: 110, mw: 95, sp: 1, rot: Math.sin(t * 4.2) * 3, n1: 1, n2: 1, n3: 1 });
    } else if (estado === 'inactivo') {
      Object.assign(d, { y: 12 + Math.sin(t * 1.3) * 5, sy: 0.98 + Math.sin(t * 1.3) * 0.015, rot: 4, lo: 0.06, ro: 0.06, mc: 12, mw: 24, zz: 1 });
    }
    return d;
  }

  const TPL = (src) => `
<style>
:host{display:inline-block;width:var(--size,240px);aspect-ratio:1/1;line-height:0}
:host([transparent]) svg{mix-blend-mode:normal}
svg{width:100%;height:100%;overflow:visible;display:block}
</style>
<svg viewBox="0 0 1254 1254" role="img" aria-label="Mascota Ã¡rbol">
<ellipse id="sh" cx="627" cy="1145" rx="250" ry="22" fill="#2a3a22"/>
<g id="body">
<image href="${src}" x="0" y="0" width="1254" height="1254"/>
<circle id="n1" cx="248" cy="697" r="50" fill="#84e655"/><circle id="n2" cx="1000" cy="697" r="50" fill="#84e655"/><circle id="n3" cx="623" cy="968" r="48" fill="#84e655"/>
<circle cx="248" cy="697" r="32" fill="#e8e8ec"/><circle cx="1000" cy="697" r="32" fill="#e8e8ec"/><circle cx="623" cy="968" r="31" fill="#e8e8ec"/>
<rect x="370" y="507" width="511" height="288" rx="128" fill="#10161d"/>
<g id="look">
<ellipse id="le" cx="487" cy="640" rx="40" ry="40" fill="#e8e8ec"/><ellipse id="re" cx="747" cy="640" rx="40" ry="40" fill="#e8e8ec"/>
<path id="la" d="M447 655 Q487 600 527 655" fill="none" stroke="#e8e8ec" stroke-width="18" stroke-linecap="round"/>
<path id="ra" d="M707 655 Q747 600 787 655" fill="none" stroke="#e8e8ec" stroke-width="18" stroke-linecap="round"/>
<g id="lx" stroke="#ff6b5e" stroke-width="16" stroke-linecap="round"><line x1="462" y1="615" x2="512" y2="665"/><line x1="512" y1="615" x2="462" y2="665"/></g>
<g id="rx" stroke="#ff6b5e" stroke-width="16" stroke-linecap="round"><line x1="722" y1="615" x2="772" y2="665"/><line x1="772" y1="615" x2="722" y2="665"/></g>
</g>
<path id="mouth" fill="none" stroke="#e8e8ec" stroke-width="20" stroke-linecap="round"/>
</g>
<g id="er"><circle cx="1050" cy="230" r="62" fill="#ff6b5e"/><rect x="1038" y="192" width="24" height="52" rx="12" fill="#10161d"/><circle cx="1050" cy="266" r="13" fill="#10161d"/></g>
<g id="sp" fill="#ffd84d"><rect id="s1" x="-22" y="-22" width="44" height="44"/><rect id="s2" x="-16" y="-16" width="32" height="32"/><rect id="s3" x="-18" y="-18" width="36" height="36"/></g>
<g id="zz" fill="#9fd8ff" font-family="Helvetica,Arial,sans-serif" font-weight="700"><text id="z1" x="920" font-size="90">Z</text><text id="z2" x="1010" font-size="64">z</text></g>
</svg>`;

  class ArbolMascota extends HTMLElement {
    static get observedAttributes() { return ['estado', 'size', 'src']; }
    constructor() {
      super();
      this._estado = 'reposo'; this._t0 = performance.now(); this._cur = null; this._vuelta = null;
      this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
      if (!this._ready) {
        this.shadowRoot.innerHTML = TPL(this.getAttribute('src') || SRC_DEFAULT);
        this._q = (id) => this.shadowRoot.getElementById(id);
        this._ready = true;
        const e = this.getAttribute('estado'); if (ESTADOS.includes(e)) this._estado = e;
        if (this.hasAttribute('size')) this.style.setProperty('--size', this.getAttribute('size') + 'px');
      }
      this._t0 = performance.now();
      this._motion = matchMedia('(prefers-reduced-motion: reduce)');
      this._visible = true;
      this._resume = () => {
        cancelAnimationFrame(this._raf);
        if (document.hidden || !this._visible) return;
        const loop = () => { this._frame(); if (!this._motion.matches) this._raf = requestAnimationFrame(loop); };
        loop();
      };
      this._motion.addEventListener('change', this._resume);
      document.addEventListener('visibilitychange', this._resume);
      this._observer = new IntersectionObserver(([entry]) => { this._visible = entry.isIntersecting; this._resume(); });
      this._observer.observe(this);
      this._resume();
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf); clearTimeout(this._to);
      this._observer?.disconnect();
      this._motion?.removeEventListener('change', this._resume);
      document.removeEventListener('visibilitychange', this._resume);
    }
    attributeChangedCallback(n, _, v) {
      if (!this._ready) return;
      if (n === 'estado') this.estado = v;
      if (n === 'src') this.shadowRoot.querySelector('image').setAttribute('href', v || SRC_DEFAULT);
      if (n === 'size') this.style.setProperty('--size', v + 'px');
    }
    get estado() { return this._estado; }
    set estado(v) {
      if (!ESTADOS.includes(v) || v === this._estado) return;
      this._estado = v; this._t0 = performance.now(); this._cur = null; this._resume?.();
      this.dispatchEvent(new CustomEvent('mascota-estado', { detail: v }));
    }
    /** Reproduce un estado y vuelve a otro: el.reproducir('login', {ms: 2000, volverA: 'reposo'}) */
    reproducir(estado, { ms = 2500, volverA = 'reposo' } = {}) {
      clearTimeout(this._to); this.estado = estado;
      this._to = setTimeout(() => { this.estado = volverA; this.dispatchEvent(new CustomEvent('mascota-fin', { detail: estado })); }, ms);
    }
    _frame() {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const t = reduce ? 0 : (performance.now() - this._t0) / 1000;
      const tg = objetivo(this._estado, t);
      if (!this._cur) this._cur = tg;
      const v = this._cur;
      for (const k in tg) v[k] += (tg[k] - v[k]) * 0.2;
      const q = this._q, T = reduce ? 0 : performance.now() / 1000;
      q('body').setAttribute('transform', `translate(${v.x} ${v.y}) translate(625 1130) rotate(${v.rot}) scale(${v.sx} ${v.sy}) translate(-625 -1130)`);
      q('sh').setAttribute('rx', 250 - Math.max(0, -v.y) * 0.8); q('sh').setAttribute('opacity', 0.7 - Math.max(0, -v.y) * 0.003);
      q('n1').setAttribute('opacity', v.n1); q('n2').setAttribute('opacity', v.n2); q('n3').setAttribute('opacity', v.n3);
      q('look').setAttribute('transform', `translate(${v.ex} ${v.ey})`);
      q('le').setAttribute('ry', 40 * Math.max(0.05, v.lo)); q('re').setAttribute('ry', 40 * Math.max(0.05, v.ro));
      q('le').setAttribute('opacity', c01(1 - v.la - v.lx)); q('re').setAttribute('opacity', c01(1 - v.ra - v.rx));
      q('la').setAttribute('opacity', c01(v.la)); q('ra').setAttribute('opacity', c01(v.ra));
      q('lx').setAttribute('opacity', c01(v.lx)); q('rx').setAttribute('opacity', c01(v.rx));
      q('mouth').setAttribute('d', `M ${625 - v.mw} 706 Q 625 ${706 + v.mc} ${625 + v.mw} 706`);
      q('er').setAttribute('opacity', c01(v.er)); q('er').setAttribute('transform', `translate(0 ${Math.sin(T * 6) * 4})`);
      q('sp').setAttribute('opacity', c01(v.sp));
      const sp = (x, y, ph) => `translate(${x} ${y + Math.sin(T * 3 + ph) * 12}) rotate(45) scale(${0.7 + 0.3 * Math.sin(T * 5 + ph)})`;
      q('s1').setAttribute('transform', sp(180, 330, 0)); q('s2').setAttribute('transform', sp(1080, 420, 2)); q('s3').setAttribute('transform', sp(900, 130, 4));
      q('zz').setAttribute('opacity', c01(v.zz));
      q('z1').setAttribute('y', 330 - ((T * 0.5) % 1) * 90); q('z2').setAttribute('y', 260 - ((T * 0.5 + 0.5) % 1) * 90);
    }
  }
  if (!customElements.get('arbol-mascota')) customElements.define('arbol-mascota', ArbolMascota);
  window.ARBOL_MASCOTA_ESTADOS = ESTADOS;
})();
