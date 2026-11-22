/* ============================================================
   Ak Çadyr v3 — туркменский той-шатёр (концепт для портфолио Нуры, 21.11.2026).
   По референсам (09 Референсы/той-шатры/РАЗБОР.md): белые шатры-пагоды 5×5 м, соединённые в зал,
   белые стены с арочными окнами, двор многоэтажек Ашхабада, длинные столы, бордовые чехлы,
   красные ковры, плов, салаты, фрукты, чурек, чай; режим «Садака»: дограма, без сцены.
   API: ToyScene.init(canvas, state) → { setState, go, onView, onHotspots, onInteract }
   ============================================================ */
(function () {
  const TAU = Math.PI * 2, MOD = 5;
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function cnv(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
  function tex(c, srgb = true, rep) { const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function noiseNormal(size, strength, rep) {
    const g = new Float32Array(size * size).map(rnd), h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { let v = 0; for (let k = 0; k < 9; k++) v += g[((y + (k / 3 | 0) - 1 + size) % size) * size + (x + k % 3 - 1 + size) % size]; h[y * size + x] = v / 9; }
    return tex(cnv(size, size, (c) => { const im = c.createImageData(size, size); for (let i = 0; i < size * size; i++) { const x = i % size, y = i / size | 0; const hx = h[y * size + (x + 1) % size] - h[i], hy = h[((y + 1) % size) * size + x] - h[i]; const nx = -hx * strength, ny = -hy * strength, l = Math.hypot(nx, ny, 1); im.data[i * 4] = (nx / l * .5 + .5) * 255; im.data[i * 4 + 1] = (ny / l * .5 + .5) * 255; im.data[i * 4 + 2] = (1 / l * .5 + .5) * 255; im.data[i * 4 + 3] = 255; } c.putImageData(im, 0, 0); }), false, rep);
  }
  function merge(geos) {
    const ps = geos.map(x => { const n = x.index ? x.toNonIndexed() : x; if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); if (!n.attributes.normal) n.computeVertexNormals(); return n; }); let n = 0; ps.forEach(p => n += p.attributes.position.count);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    ps.forEach(p => { pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); uv.set(p.attributes.uv.array, o * 2); o += p.attributes.position.count; });
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m;
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _one = new THREE.Vector3(1, 1, 1);
  function rod(a, b, r, seg = 8) { const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), seg, 1); _q.setFromUnitVectors(_up, b.clone().sub(a).normalize()); _m.compose(a.clone().add(b).multiplyScalar(.5), _q, _one); g.applyMatrix4(_m); return g; }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const L2 = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg);

  // ---------------- текстуры ----------------
  function makeTextures() {
    const T = {};
    T.pvc = tex(cnv(512, 512, (c, w, h) => { c.fillStyle = '#f7f5f0'; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 228 + rnd() * 27 | 0; c.fillStyle = `rgba(${v},${v},${v - 6},.35)`; c.fillRect(rnd() * w, rnd() * h, 2, 2); } for (let x = 0; x < w; x += 64) { c.fillStyle = 'rgba(170,165,150,.25)'; c.fillRect(x, 0, 2, h); } }), true, [2, 2]);
    T.wall = tex(cnv(1024, 560, (c, w, h) => { c.fillStyle = '#f6f4ef'; c.fillRect(0, 0, w, h);
      [[150, 330], [574, 330]].forEach(([x0, ww]) => { const top = 140, bot = h - 70; c.save(); c.beginPath(); c.moveTo(x0, bot); c.lineTo(x0, top + ww / 2); c.arc(x0 + ww / 2, top + ww / 2, ww / 2, Math.PI, 0); c.lineTo(x0 + ww, bot); c.closePath(); c.clip(); c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(190,205,215,.16)'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 7; c.beginPath(); c.moveTo(x0 + ww / 2, top); c.lineTo(x0 + ww / 2, bot); for (let k = 1; k < 4; k++) { const y = top + ww / 2 + k * (bot - top - ww / 2) / 4; c.moveTo(x0, y); c.lineTo(x0 + ww, y); } c.stroke(); c.restore();
        c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.beginPath(); c.moveTo(x0, bot); c.lineTo(x0, top + ww / 2); c.arc(x0 + ww / 2, top + ww / 2, ww / 2, Math.PI, 0); c.lineTo(x0 + ww, bot); c.closePath(); c.stroke(); });
      c.fillStyle = 'rgba(160,150,130,.25)'; c.fillRect(0, h - 26, w, 4); c.fillRect(0, 22, w, 3); }));
    T.carpet = tex(cnv(1024, 768, (c, w, h) => {
      c.fillStyle = '#7e1714'; c.fillRect(0, 0, w, h);
      const B = 70; c.fillStyle = '#2b1414'; c.fillRect(0, 0, w, B); c.fillRect(0, h - B, w, B); c.fillRect(0, 0, B, h); c.fillRect(w - B, 0, B, h);
      c.fillStyle = '#efe2c8'; for (let x = B; x < w - B; x += 26) { c.fillRect(x, B * .42, 12, 12); c.fillRect(x, h - B * .58, 12, 12); } for (let y = B; y < h - B; y += 26) { c.fillRect(B * .42, y, 12, 12); c.fillRect(w - B * .58, y, 12, 12); }
      c.strokeStyle = '#c9a24a'; c.lineWidth = 4; c.strokeRect(B - 6, B - 6, w - 2 * B + 12, h - 2 * B + 12);
      const gol = (x, y, s) => { c.save(); c.translate(x, y); c.fillStyle = '#5a0f0e'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + TAU / 16; c.lineTo(Math.cos(a) * s, Math.sin(a) * s * .62); } c.closePath(); c.fill(); c.strokeStyle = '#efe2c8'; c.lineWidth = 3; c.stroke();
        const q = [['#1f2a44', '#c45a2c'], ['#c45a2c', '#1f2a44']]; for (let i = 0; i < 4; i++) { c.fillStyle = q[i % 2][(i / 2 | 0)]; c.beginPath(); c.moveTo(0, 0); for (let k = 0; k <= 4; k++) { const a = (i + k / 4) / 4 * TAU; c.lineTo(Math.cos(a) * s * .62, Math.sin(a) * s * .38); } c.closePath(); c.fill(); }
        c.fillStyle = '#efe2c8'; c.beginPath(); c.moveTo(-s * .18, 0); c.lineTo(0, -s * .12); c.lineTo(s * .18, 0); c.lineTo(0, s * .12); c.closePath(); c.fill(); c.restore(); };
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const x = B + 78 + k * ((w - 2 * B - 156) / 5), y = B + 70 + r * ((h - 2 * B - 140) / 3); gol(x, y, 62); }
      for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) { const x = B + 78 + (k + .5) * ((w - 2 * B - 156) / 5), y = B + 70 + (r + .5) * ((h - 2 * B - 140) / 3); c.fillStyle = '#efe2c8'; c.beginPath(); c.moveTo(x - 14, y); c.lineTo(x, y - 9); c.lineTo(x + 14, y); c.lineTo(x, y + 9); c.closePath(); c.fill(); }
      for (let i = 0; i < 20000; i++) { c.fillStyle = `rgba(0,0,0,${rnd() * .12})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
    }));
    T.velvet = noiseNormal(128, 1.6, [3, 3]);
    T.cloth = noiseNormal(128, 1.0, [6, 2]);
    T.asphalt = tex(cnv(256, 256, (c, w, h) => { c.fillStyle = '#26272a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 12000; i++) { const v = 25 + rnd() * 40 | 0; c.fillStyle = `rgb(${v},${v},${v + 2})`; c.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } }), true, [80, 80]);
    T.tile = tex(cnv(256, 256, (c, w, h) => { c.fillStyle = '#cfc8bb'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8a091'; c.lineWidth = 2; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } }), true, [12, 8]);
    T.facadeMap = tex(cnv(512, 1024, (c, w, h) => { c.fillStyle = '#e9e7e2'; c.fillRect(0, 0, w, h); for (let fl = 0; fl < 12; fl++) for (let k = 0; k < 6; k++) { const x = 22 + k * 82, y = 60 + fl * 78; c.fillStyle = '#3a4350'; c.fillRect(x + 6, y + 6, 44, 38); c.fillStyle = '#d2cfc8'; c.fillRect(x, y + 44, 56, 5); c.fillRect(x, y, 3, 50); c.fillRect(x + 53, y, 3, 50); } c.fillStyle = '#d8d5ce'; c.fillRect(0, 0, w, 40); }));
    T.facadeEm = tex(cnv(512, 1024, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let fl = 0; fl < 12; fl++) for (let k = 0; k < 6; k++) if (rnd() < .22) { const x = 22 + k * 82, y = 60 + fl * 78; c.fillStyle = rnd() < .75 ? '#c99a5c' : '#8fa6c4'; c.fillRect(x + 6, y + 6, 44, 38); } }));
    T.facadeMap.wrapS = T.facadeEm.wrapS = THREE.RepeatWrapping;
    T.contact = tex(cnv(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }));
    T.glow = tex(cnv(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,225,170,1)'); g.addColorStop(.3, 'rgba(255,190,110,.5)'); g.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }));
    const speck = (base, dots) => tex(cnv(256, 256, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); dots.forEach(([col, n, s]) => { for (let i = 0; i < n; i++) { c.fillStyle = col; c.save(); c.translate(rnd() * w, rnd() * h); c.rotate(rnd() * TAU); c.fillRect(-s / 2, -s / 4, s, s / 2); c.restore(); } }); }));
    T.palow = speck('#e2c27e', [['#f3e2b6', 1400, 7], ['#e07a2a', 260, 9], ['#d4632a', 120, 12], ['#6b3a22', 70, 16], ['#f6edd2', 400, 6]]);
    T.salad = speck('#5d8a3a', [['#d8342a', 120, 22], ['#9cc46a', 160, 18], ['#f2f0e6', 60, 10], ['#2f5f22', 200, 8], ['#e9e1c0', 40, 14]]);
    T.dograma = speck('#8a5a2e', [['#d9b37a', 200, 18], ['#6b3c1c', 120, 14], ['#c9483a', 40, 10], ['#e8d6b0', 120, 8]]);
    T.chorek = tex(cnv(256, 256, (c) => { const g = c.createRadialGradient(128, 128, 20, 128, 128, 128); g.addColorStop(0, '#e9b96a'); g.addColorStop(.7, '#c4823c'); g.addColorStop(1, '#8f5521'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); c.strokeStyle = 'rgba(120,70,25,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(128, 128, 44, 0, TAU); c.stroke(); for (let i = 0; i < 60; i++) { const a = rnd() * TAU, r = rnd() * 40; c.fillStyle = 'rgba(90,50,20,.6)'; c.fillRect(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 3, 3); } for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; c.beginPath(); c.moveTo(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60); c.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); c.stroke(); } }));
    T.teapot = tex(cnv(256, 128, (c, w, h) => { c.fillStyle = '#f7f6f2'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a4f9a'; for (let x = 0; x < w; x += 32) { c.beginPath(); c.arc(x + 16, h / 2, 9, 0, TAU); c.fill(); c.fillRect(x + 4, h / 2 - 22, 24, 3); c.fillRect(x + 4, h / 2 + 19, 24, 3); } c.fillStyle = '#c9a24a'; c.fillRect(0, 6, w, 4); c.fillRect(0, h - 10, w, 4); }), true, [3, 1]);
    T.sachak = tex(cnv(1024, 160, (c, w, h) => { c.fillStyle = '#f4efe4'; c.fillRect(0, 0, w, h); c.fillStyle = '#9e1f1a'; c.fillRect(0, 0, w, 16); c.fillRect(0, h - 16, w, 16); c.fillStyle = '#c9a24a'; c.fillRect(0, 18, w, 4); c.fillRect(0, h - 22, w, 4); c.fillStyle = '#9e1f1a'; for (let x = 10; x < w; x += 40) { c.beginPath(); c.moveTo(x, 34); c.lineTo(x + 10, 26); c.lineTo(x + 20, 34); c.lineTo(x + 10, 42); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x, h - 34); c.lineTo(x + 10, h - 42); c.lineTo(x + 20, h - 34); c.lineTo(x + 10, h - 26); c.closePath(); c.fill(); } }));
    T.dushek = tex(cnv(512, 128, (c, w, h) => { const cols = ['#9e1f1a', '#c2552a', '#7a1414', '#d9a441', '#9e1f1a', '#2b2a4a', '#9e1f1a']; let y = 0; cols.forEach((col, i) => { const hh = i % 2 ? 10 : 26; c.fillStyle = col; c.fillRect(0, y, w, hh); y += hh; }); c.fillStyle = '#9e1f1a'; c.fillRect(0, y, w, h - y); for (let i = 0; i < 4000; i++) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(rnd() * w, rnd() * h, 2, 2); } }), true, [4, 1]);
    T.ledCanvas = cnv(512, 288, () => { }); T.led = tex(T.ledCanvas);
    T.backdrop = tex(cnv(1024, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6e1215'); g.addColorStop(1, '#3d0a0c'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, 0, 6, h); }
      c.fillStyle = '#c9a24a'; c.fillRect(0, 28, w, 10); c.fillRect(0, h - 38, w, 10); for (let x = 0; x < w; x += 48) { c.beginPath(); c.moveTo(x, 58); c.lineTo(x + 24, 44); c.lineTo(x + 48, 58); c.lineTo(x + 24, 72); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x, h - 58); c.lineTo(x + 24, h - 72); c.lineTo(x + 48, h - 58); c.lineTo(x + 24, h - 44); c.closePath(); c.fill(); }
      c.textAlign = 'center'; c.fillStyle = '#e8c57a'; c.font = 'italic 600 64px Georgia, serif'; c.fillText('Toýuňyz gutly bolsun!', w / 2, h / 2 + 22); }));
    return T;
  }
  function drawLED(c, t) {
    const ctx = c.getContext('2d'), w = c.width, h = c.height;
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2b0f12'); g.addColorStop(.5, '#7a2a1c'); g.addColorStop(1, '#1b0d0a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const x = (i * 97 + t * 30) % w, y = (i * 53 + Math.sin(t + i) * 20 + h) % h; ctx.fillStyle = `rgba(255,${200 + i % 50},${120 + i % 80},${.3 + .3 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3), 0, TAU); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#f6e3b8'; ctx.font = 'italic 600 40px Georgia, serif'; ctx.fillText('Toýuňyz gutly bolsun!', w / 2, h / 2 + 4);
    ctx.font = '600 15px Segoe UI, Arial'; ctx.fillStyle = 'rgba(246,227,184,.7)'; ctx.fillText('A K   Ç A D Y R', w / 2, h / 2 + 44);
  }

  // ---------------- материалы ----------------
  function makeMaterials(T) {
    const s = (o) => { const m = new THREE.MeshStandardMaterial(o); if (o.color !== undefined) m.color.convertSRGBToLinear(); if (o.emissive !== undefined) m.emissive.convertSRGBToLinear(); return m; };
    const M = {
      pvc: s({ color: '#ffffff', map: T.pvc, emissiveMap: T.pvc, roughness: .55, metalness: 0, side: THREE.DoubleSide, emissive: '#ffb866', emissiveIntensity: 0 }),
      wall: s({ color: '#ffffff', map: T.wall, emissiveMap: T.wall, roughness: .55, metalness: 0, side: THREE.DoubleSide, transparent: true, alphaTest: .02, emissive: '#ffb866', emissiveIntensity: 0 }),
      alu: s({ color: '#d7d9dc', roughness: .35, metalness: .9 }),
      carpet: s({ color: '#ffffff', map: T.carpet, roughness: .95, metalness: 0, normalMap: T.velvet, normalScale: new THREE.Vector2(.25, .25) }),
      deck: s({ color: '#3a2a20', roughness: .8, metalness: 0 }),
      cloth: s({ color: '#f5f3ee', roughness: .85, metalness: 0, normalMap: T.cloth, normalScale: new THREE.Vector2(.3, .3) }),
      runnerRed: s({ color: '#8e1b1a', roughness: .7, metalness: .05, normalMap: T.velvet, normalScale: new THREE.Vector2(.3, .3) }),
      runnerGold: s({ color: '#c9a24a', roughness: .4, metalness: .7 }),
      coverRed: s({ color: '#6d1418', roughness: .62, metalness: 0, normalMap: T.velvet, normalScale: new THREE.Vector2(.4, .4) }),
      coverWhite: s({ color: '#f3f0e9', roughness: .8, metalness: 0, normalMap: T.cloth }),
      sash: s({ color: '#c9a24a', roughness: .35, metalness: .6 }),
      plate: s({ color: '#fbfaf6', roughness: .22, metalness: 0 }),
      gold: s({ color: '#c9a14e', roughness: .28, metalness: 1 }),
      glass: new THREE.MeshPhysicalMaterial({ color: lin('#ffffff'), roughness: .02, metalness: 0, transparent: true, opacity: .14, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.6 }),
      bottle: new THREE.MeshPhysicalMaterial({ color: lin('#ffffff'), roughness: .1, metalness: 0, transparent: true, opacity: .8, clearcoat: 1 }),
      palow: s({ color: '#ffffff', map: T.palow, roughness: .85, metalness: 0 }),
      salad: s({ color: '#ffffff', map: T.salad, roughness: .7, metalness: 0 }),
      dograma: s({ color: '#ffffff', map: T.dograma, roughness: .6, metalness: 0 }),
      chorek: s({ color: '#ffffff', map: T.chorek, roughness: .8, metalness: 0 }),
      teapot: s({ color: '#ffffff', map: T.teapot, roughness: .2, metalness: 0 }),
      kase: s({ color: '#ffffff', map: T.teapot, roughness: .2, metalness: 0 }),
      fruit: s({ color: '#ffffff', roughness: .45, metalness: 0 }),
      wood: s({ color: '#7a4d2b', roughness: .5, metalness: 0 }),
      sachak: s({ color: '#ffffff', map: T.sachak, roughness: .85, metalness: 0 }),
      dushek: s({ color: '#ffffff', map: T.dushek, roughness: .85, metalness: 0, normalMap: T.velvet, normalScale: new THREE.Vector2(.3, .3) }),
      cushion: s({ color: '#8e1b1a', roughness: .7, metalness: 0, normalMap: T.velvet, normalScale: new THREE.Vector2(.4, .4) }),
      sweet: s({ color: '#ffffff', roughness: .4, metalness: 0 }),
      bulb: s({ color: '#000000', emissive: '#ffc06e', emissiveIntensity: 3.0 }),
      lampShade: s({ color: '#fff4e0', emissive: '#ffcf8a', emissiveIntensity: 1.2, roughness: .9, side: THREE.DoubleSide }),
      crystal: new THREE.MeshPhysicalMaterial({ color: lin('#ffffff'), roughness: .02, metalness: .2, clearcoat: 1, emissive: lin('#ffdca8'), emissiveIntensity: .7, transparent: true, opacity: .88 }),
      drape: s({ color: '#fbf8f1', roughness: .9, metalness: 0, side: THREE.DoubleSide }),
      backdrop: s({ color: '#ffffff', map: T.backdrop, roughness: .7, metalness: 0, emissive: '#ffffff', emissiveMap: T.backdrop, emissiveIntensity: .12 }),
      stage: s({ color: '#2a1d18', roughness: .6, metalness: .1 }),
      sofa: s({ color: '#f1ebe0', roughness: .7, metalness: 0, normalMap: T.velvet, normalScale: new THREE.Vector2(.3, .3) }),
      dark: s({ color: '#151515', roughness: .5, metalness: .4 }),
      led: s({ color: '#000000', emissive: '#ffffff', emissiveMap: T.led, emissiveIntensity: 1.1, roughness: .3 }),
      grille: s({ color: '#eceae6', roughness: .5, metalness: .1 }),
      asphalt: s({ color: '#ffffff', map: T.asphalt, roughness: .95, metalness: 0 }),
      tile: s({ color: '#ffffff', map: T.tile, roughness: .9, metalness: 0 }),
      facade: s({ color: '#ffffff', map: T.facadeMap, emissive: '#ffffff', emissiveMap: T.facadeEm, emissiveIntensity: .9, roughness: .5, metalness: .05 }),
      lamp: s({ color: '#000000', emissive: '#ffd9a0', emissiveIntensity: 3 }),
      contact: new THREE.MeshBasicMaterial({ map: T.contact, transparent: true, depthWrite: false }),
      glowSpr: new THREE.SpriteMaterial({ map: T.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
    Object.values(M).forEach(m => { if (m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial) m.envMapIntensity = m.metalness > .5 ? .9 : .22; });
    return M;
  }

  // ---------------- размеры: модули 5×5 ----------------
  const TIERS = [[4, 3], [6, 3], [8, 3], [10, 3], [10, 4]];
  function layout(cols, rows, kind) { if (kind === 'topchan') { const A = cols * MOD / 2, B = rows * MOD / 2, spots = []; for (let z = 2.5; z <= B - 1.2; z += 2.8) for (let x = -A + 1.9; x <= A - 2.6; x += 3.0) spots.push([x, z], [x, -z]); return { A, B, spots, cap: spots.length * 8, kind }; } const floor = kind === 'floor'; const A = cols * MOD / 2, B = rows * MOD / 2, x0 = -A + (floor ? 2.2 : 6.3), x1 = A - 1.2, nx = Math.max(1, Math.floor((x1 - x0 + .4) / 6.4)), lines = [], st = floor ? 3.2 : 2.7; for (let z = floor ? 2.4 : 2.1; z <= B - 1.2; z += st) lines.push(z, -z); return { A, B, nx, lines, cap: nx * lines.length * 20, x0, kind: kind || 'tables' }; }
  function tierFor(g, kind) { const n = Math.ceil(g / (kind === 'topchan' ? 8 : 20)); for (const [c, r] of TIERS) { const L = layout(c, r, kind); if (L.cap >= g) return Object.assign({ cols: c, rows: r, guests: g }, L); } const [c, r] = TIERS[TIERS.length - 1]; return Object.assign({ cols: c, rows: r, guests: g }, layout(c, r, kind)); }
  const split = (g) => { const a = Math.ceil(g / 3 / 10) * 10, b = Math.ceil((g - a) / 2 / 10) * 10; return [tierFor(a, 'tables'), tierFor(b, 'floor'), tierFor(g - a - b, 'topchan')]; };

  function init(canvas, state0) {
    const mobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
    renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), .04).texture;
    const cam = new THREE.PerspectiveCamera(60, 1, .05, 900);
    const T = makeTextures(), M = makeMaterials(T);
    { const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: 'varying vec3 p; void main(){ float y = clamp(p.y,0.,1.); vec3 top = vec3(.004,.007,.02), hor = vec3(.06,.045,.05); gl_FragColor = vec4(mix(hor, top, pow(y,.45)),1.); }' }));
      scene.add(sky); const N = 900, sp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = rnd() * TAU, y = .2 + rnd() * .8, r = Math.sqrt(1 - y * y); sp.set([Math.cos(a) * r * 500, y * 500, Math.sin(a) * r * 500], i * 3); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfc8ff, size: 1.1, sizeAttenuation: false, transparent: true, opacity: .7 }))); }
    scene.add(new THREE.HemisphereLight(lin('#3b4a7a'), lin('#2a1b10'), .1));
    const moon = new THREE.DirectionalLight(lin('#8fa3d9'), .2); moon.position.set(-40, 60, -30); scene.add(moon);

    let world = null, views = {}, hotspots = [], ledMesh = [], warm = [];
    const state = Object.assign({ guests: 300, premium: false, event: 'toy', stage: true, ac: false, led: false, aisle: false }, state0);

    // ---------- двор Ашхабада ----------
    function buildYard(g, D) {
      const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 64), M.asphalt); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(D.A * 2 + 14, D.B * 2 + 12), M.tile); pad.rotation.x = -Math.PI / 2; pad.position.set(0, .01, D.zc); pad.receiveShadow = true; g.add(pad);
      const bld = (x, z, w, d) => { const geo = new THREE.BoxGeometry(w, 36, d); const uv = geo.attributes.uv, nrm = geo.attributes.normal; for (let i = 0; i < uv.count; i++) { const side = Math.abs(nrm.getX(i)) > .5 ? d : w; uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(side / 14)), uv.getY(i)); } const b = new THREE.Mesh(geo, M.facade); b.position.set(x, 18, z); g.add(b); const roof = new THREE.Mesh(new THREE.BoxGeometry(w + .6, .8, d + .6), M.grille); roof.position.set(x, 36.4, z); g.add(roof); };
      bld(-D.A - 48, D.zc - 10, 14, 70); bld(-10, D.zc - D.B - 52, 80, 14); bld(D.A + 70, D.zc - D.B - 30, 14, 50); bld(-D.A * .4, D.zc + D.B + 60, 60, 14);
      for (let i = -2; i <= 2; i++) { const x = D.A + 8, z = D.zc + i * 8; const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 6, 8), M.dark); post.position.set(x, 3, z); g.add(post); const l = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8), M.lamp); l.position.set(x, 6.1, z); g.add(l); const sp = new THREE.Sprite(M.glowSpr); sp.position.copy(l.position); sp.scale.setScalar(3); g.add(sp); }
      const sl = new THREE.PointLight(lin('#ffcf94'), 1.1, 26, 2); sl.position.set(D.A + 8, 6, D.zc); g.add(sl);
    }
    // ---------- гелин алыжы: дорожка, арка у входа, свадебная машина ----------
    function buildGelin(g, D) {
      if (state.event !== 'gelin') return;
      const z = D.doorZ, A = D.A;
      const path = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.6).rotateX(-Math.PI / 2), M.runnerRed); path.position.set(A + 6.5, .03, z); path.receiveShadow = true; g.add(path);
      // арка из цветов
      const fl = [], c = new THREE.Color(); for (let i = 0; i <= 90; i++) { const a = Math.PI * i / 90, zz = z + Math.cos(a) * 1.55, y = Math.sin(a) * 2.9; for (let k = 0; k < 4; k++) fl.push([A + 1.2 + (rnd() - .5) * .22, y + (rnd() - .5) * .22, zz + (rnd() - .5) * .22, k]); }
      const fm = new THREE.InstancedMesh(new THREE.SphereGeometry(.075, 10, 8), M.fruit, fl.length), d = new THREE.Object3D(); const pal = ['#ffffff', '#f6d6cf', '#d9273a', '#fbe9d0'];
      fl.forEach(([x, y, zz, k], i) => { d.position.set(x, y + .05, zz); d.scale.setScalar(.8 + rnd() * .6); d.updateMatrix(); fm.setMatrixAt(i, d.matrix); fm.setColorAt(i, c.set(pal[k]).convertSRGBToLinear()); }); fm.instanceColor.needsUpdate = true; g.add(fm);
      g.add(new THREE.Mesh(new THREE.TorusGeometry(1.55, .03, 8, 48, Math.PI).rotateY(Math.PI / 2).translate(A + 1.2, .05, z), M.gold));
      // машина с лентами
      const car = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: lin('#f4f4f2'), metalness: .6, roughness: .25 }), glassM = new THREE.MeshStandardMaterial({ color: lin('#141a22'), metalness: .3, roughness: .1 });
      const add = (geo, m, x, y, zz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, zz); o.castShadow = true; car.add(o); return o; };
      add(new THREE.BoxGeometry(4.7, .62, 1.85), body, 0, .62, 0); add(new THREE.BoxGeometry(2.5, .55, 1.68), body, -.25, 1.2, 0); add(new THREE.BoxGeometry(2.3, .44, 1.72), glassM, -.25, 1.2, 0);
      [[-1.5, .92], [1.45, .92], [-1.5, -.92], [1.45, -.92]].forEach(([x, zz]) => { const w = add(new THREE.CylinderGeometry(.36, .36, .26, 20).rotateX(Math.PI / 2), M.dark, x, .36, zz); });
      [-.6, .6].forEach(zz => add(new THREE.BoxGeometry(.05, .12, .3), M.lamp, 2.36, .75, zz));
      [-.35, .35].forEach(zz => add(new THREE.BoxGeometry(2.0, .02, .09), M.runnerRed, 1.3, .94, zz));
      add(new THREE.TorusGeometry(.16, .05, 8, 16).rotateX(Math.PI / 2), M.runnerRed, 2.0, .98, 0); add(new THREE.SphereGeometry(.09, 10, 8), M.runnerRed, 2.0, 1.0, 0);
      car.position.set(A + 12.5, 0, z + 2.6); car.rotation.y = Math.PI; g.add(car);
    }

    // ---------- шатёр из пагод ----------
    function buildTent(g, D) {
      const { A, B, cols, rows } = D, EAVE = 2.7, APEX = 5.6;
      D.EAVE = EAVE; D.APEX = APEX;
      { const geos = []; const N = 26;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const cx = -A + MOD * (i + .5), cz = -B + MOD * (j + .5), pos = [], uv = [], idx = [];
          for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) { const u = a / N * 2 - 1, v = b / N * 2 - 1; const d = Math.max(Math.abs(u), Math.abs(v)); pos.push(cx + u * MOD / 2, EAVE + (APEX - EAVE) * Math.pow(1 - d, 2.1), cz + v * MOD / 2); uv.push(a / N, b / N); }
          for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const p = a * (N + 1) + b; idx.push(p, p + 1, p + N + 1, p + 1, p + N + 2, p + N + 1); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); geos.push(geo);
          const sp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .06, .7, 8), M.alu); sp.position.set(cx, APEX + .3, cz); g.add(sp); const ball = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), M.gold); ball.position.set(cx, APEX + .7, cz); g.add(ball); }
        const roof = new THREE.Mesh(merge(geos), M.pvc); roof.receiveShadow = true; g.add(roof); }
      // стены с арочными окнами; вход посередине торца +X
      { const geos = [], doorJ = Math.floor(rows / 2);
        const panel = (ax, az, bx, bz) => { const g2 = new THREE.PlaneGeometry(MOD, EAVE); g2.rotateY(-Math.atan2(bz - az, bx - ax)); g2.translate((ax + bx) / 2, EAVE / 2, (az + bz) / 2); geos.push(g2); };
        for (let i = 0; i < cols; i++) { panel(-A + MOD * i, B, -A + MOD * (i + 1), B); panel(-A + MOD * i, -B, -A + MOD * (i + 1), -B); }
        for (let j = 0; j < rows; j++) { panel(-A, -B + MOD * j, -A, -B + MOD * (j + 1)); if (j !== doorJ) panel(A, -B + MOD * j, A, -B + MOD * (j + 1)); }
        g.add(new THREE.Mesh(merge(geos), M.wall));
        const z0 = -B + MOD * doorJ;
        [[z0, z0 + 1.3], [z0 + 3.7, z0 + MOD]].forEach(([a, b]) => g.add(new THREE.Mesh(new THREE.PlaneGeometry(b - a, EAVE).rotateY(Math.PI / 2).translate(A, EAVE / 2, (a + b) / 2), M.pvc)));
        g.add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, .45).rotateY(Math.PI / 2).translate(A, EAVE - .22, z0 + 2.5), M.pvc));
        [z0 + 1.45, z0 + 3.55].forEach((z, k) => { const c = new THREE.PlaneGeometry(.7, EAVE - .45, 12, 6); const p = c.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), pin = clamp(1 - Math.abs(y + .1) / 1.0); p.setX(i, x * (1 - .5 * pin) + (k ? .12 : -.12) * pin); p.setZ(i, Math.sin(x * 20) * .04); } c.computeVertexNormals(); c.rotateY(Math.PI / 2); c.translate(A - .08, (EAVE - .45) / 2, z); g.add(new THREE.Mesh(c, M.drape)); const tie = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 6, 16), M.gold); tie.position.set(A - .1, 1.15, z); tie.rotation.y = Math.PI / 2; g.add(tie); });
        D.doorZ = z0 + 2.5; }
      // каркас: стойки по периметру и балки-стыки
      { const geos = []; for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) { const x = -A + MOD * i, z = -B + MOD * j; if (i === 0 || i === cols || j === 0 || j === rows) geos.push(rod(V(x, 0, z), V(x, EAVE, z), .06, 10)); }
        for (let i = 0; i <= cols; i++) geos.push(new THREE.BoxGeometry(.1, .14, 2 * B).translate(-A + MOD * i, EAVE - .02, 0)); for (let j = 0; j <= rows; j++) geos.push(new THREE.BoxGeometry(2 * A, .14, .1).translate(0, EAVE - .02, -B + MOD * j));
        const fr = new THREE.Mesh(merge(geos), M.alu); fr.castShadow = true; g.add(fr); }
      // фестоны из ткани вдоль стыков
      { const geos = []; const fest = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 1.25), seg = 10; for (let k = 0; k < n; k++) { const pos = [], idx = []; for (let s = 0; s <= seg; s++) { const t = s / seg, x = ax + (bx - ax) * (k + t) / n, z = az + (bz - az) * (k + t) / n, sag = Math.sin(Math.PI * t) * .32; pos.push(x, EAVE - .06, z, x, EAVE - .1 - sag, z); } for (let s = 0; s < seg; s++) { const a = s * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); geos.push(geo); } };
        for (let i = 0; i <= cols; i++) fest(-A + MOD * i, -B + .05, -A + MOD * i, B - .05); for (let j = 0; j <= rows; j++) fest(-A + .05, -B + MOD * j, A - .05, -B + MOD * j);
        g.add(new THREE.Mesh(merge(geos), M.drape)); }
      // пол: настил + туркменские ковры
      { const deck = new THREE.Mesh(new THREE.BoxGeometry(2 * A, .12, 2 * B), M.deck); deck.position.y = .06; deck.receiveShadow = true; g.add(deck);
        const cw = 4.2, cd = 3.0, cx = Math.floor(2 * A / cw), cz = Math.floor(2 * B / cd); const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(cw - .08, cd - .08).rotateX(-Math.PI / 2), M.carpet, cx * cz); const d = new THREE.Object3D(); let k = 0;
        for (let i = 0; i < cx; i++) for (let j = 0; j < cz; j++) { d.position.set(-A + (2 * A - cx * cw) / 2 + cw * (i + .5), .125, -B + (2 * B - cz * cd) / 2 + cd * (j + .5)); d.rotation.y = (i + j) % 2 ? Math.PI : 0; d.updateMatrix(); im.setMatrixAt(k++, d.matrix); } im.receiveShadow = true; g.add(im); }
      // гирлянды вдоль стыков
      { const bulbs = [];
        for (let i = 0; i <= cols; i++) for (let s = 0; s <= 20 * rows; s++) bulbs.push(V(-A + MOD * i, EAVE - .2 - .15 * Math.abs(Math.sin(s * Math.PI / 4)), -B + s / (20 * rows) * 2 * B));
        for (let j = 0; j <= rows; j++) for (let s = 0; s <= 20 * cols; s++) bulbs.push(V(-A + s / (20 * cols) * 2 * A, EAVE - .2 - .15 * Math.abs(Math.sin(s * Math.PI / 4)), -B + MOD * j));
        const im = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 6), M.bulb, bulbs.length); const d = new THREE.Object3D(); bulbs.forEach((q, i) => { d.position.copy(q); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); g.add(im); }
      // люстры (Премиум) или светильники-барабаны (Стандарт) под каждым куполом
      const cr = [], cb = [], shades = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const cx = -A + MOD * (i + .5), cz = -B + MOD * (j + .5), y = 3.65;
        g.add(new THREE.Mesh(rod(V(cx, y + .3, cz), V(cx, APEX - .2, cz), .012), M.gold));
        if (state.premium) { [[.62, 0], [.44, .26], [.26, .48]].forEach(([r, dy]) => { const n = Math.round(r * 30); for (let k = 0; k < n; k++) { const a = k / n * TAU; for (let q = 0; q < 3; q++) cr.push(V(cx + Math.cos(a) * r, y + dy - q * .08 - (k % 2) * .04, cz + Math.sin(a) * r)); cb.push(V(cx + Math.cos(a + .1) * r, y + dy + .07, cz + Math.sin(a + .1) * r)); } }); g.add(new THREE.Mesh(new THREE.TorusGeometry(.62, .013, 6, 48).rotateX(Math.PI / 2).translate(cx, y, cz), M.gold)); }
        else shades.push([cx, y, cz]);
        if ((i + j) % 2 === 0) { const L = new THREE.PointLight(lin('#ffc27a'), .9, 9, 2); L.position.set(cx, y - .3, cz); g.add(L); warm.push(L); } }
      { const d = new THREE.Object3D();
        if (cr.length) { const cg = new THREE.OctahedronGeometry(.026, 0); cg.scale(1, 1.8, 1); const cm = new THREE.InstancedMesh(cg, M.crystal, cr.length); cr.forEach((p, i) => { d.position.copy(p); d.rotation.set(0, rnd() * TAU, 0); d.updateMatrix(); cm.setMatrixAt(i, d.matrix); }); g.add(cm); const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.032, 8, 6), M.bulb, cb.length); cb.forEach((p, i) => { d.position.copy(p); d.rotation.set(0, 0, 0); d.updateMatrix(); bm.setMatrixAt(i, d.matrix); }); g.add(bm); }
        if (shades.length) { const sh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.45, .45, .38, 32, 1, true), M.lampShade, shades.length); shades.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.rotation.set(0, 0, 0); d.updateMatrix(); sh.setMatrixAt(i, d.matrix); }); g.add(sh); } }
      { const L = new THREE.PointLight(lin('#ffcf94'), .9, 2 * A, 2); L.position.set(0, 4.4, 0); if (renderer.shadowMap.enabled) { L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.radius = 4; L.shadow.bias = -.002; } g.add(L); warm.push(L); }
      if (state.ac) for (let i = 0; i < cols; i += 2) [-1, 1].forEach(s => { const u = new THREE.Mesh(new THREE.BoxGeometry(.55, 1.85, .38), M.grille); u.position.set(-A + MOD * (i + .5), 1.05, s * (B - .35)); u.castShadow = true; g.add(u); const vent = new THREE.Mesh(new THREE.BoxGeometry(.45, .3, .02), M.dark); vent.position.set(u.position.x, 1.7, s * (B - .56)); g.add(vent); });
      return D;
    }

    // ---------- длинные столы, стулья в чехлах, туркменский стол ----------
    function buildTopchans(g, D) {
      const n = Math.ceil(D.guests / 8), spots = D.spots.slice().sort((a, b) => (Math.abs(a[1]) - Math.abs(b[1])) * 2 + (a[0] - b[0]) * .2).slice(0, n); D.tables = spots;
      const d = new THREE.Object3D(), Y = .12, H = .45, Wx = 2.4, Wz = 2.0, put = (geo, mat, list, fn, shadow) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((a, i) => { d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.setScalar(1); fn(a, d); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); if (shadow) im.castShadow = im.receiveShadow = true; g.add(im); return im; };
      const place = ([x, z], o, lx, ly, lz) => { const s = z > 0 ? 1 : -1; o.position.set(x + lx * s, Y + ly, z + lz * s); o.rotation.set(0, z > 0 ? 0 : Math.PI, 0); };
      // каркас топчана: помост, царга, ножки, резные перила с трёх сторон (открытая сторона — к проходу)
      const wood = []; wood.push(new THREE.BoxGeometry(Wx, .06, Wz).translate(0, H, 0));
      [[0, Wz / 2], [0, -Wz / 2]].forEach(([x, z]) => wood.push(new THREE.BoxGeometry(Wx, .14, .05).translate(x, H - .09, z))); [-1, 1].forEach(s => wood.push(new THREE.BoxGeometry(.05, .14, Wz).translate(s * Wx / 2, H - .09, 0)));
      [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]].forEach(([a, b]) => wood.push(new THREE.BoxGeometry(.09, H, .09).translate(a * (Wx / 2 - .05), H / 2, b * (Wz / 2 - .05))));
      const RH = .46; wood.push(new THREE.BoxGeometry(Wx, .06, .07).translate(0, H + RH, Wz / 2 - .03)); [-1, 1].forEach(s => { wood.push(new THREE.BoxGeometry(.07, .06, Wz).translate(s * (Wx / 2 - .03), H + RH, 0)); wood.push(new THREE.BoxGeometry(.08, RH + .1, .08).translate(s * (Wx / 2 - .04), H + RH / 2, Wz / 2 - .04)); wood.push(new THREE.BoxGeometry(.08, RH + .1, .08).translate(s * (Wx / 2 - .04), H + RH / 2, -Wz / 2 + .04)); });
      for (let x = -Wx / 2 + .2; x < Wx / 2 - .1; x += .16) wood.push(new THREE.CylinderGeometry(.018, .022, RH - .04, 8).translate(x, H + RH / 2, Wz / 2 - .03));
      for (let z = -Wz / 2 + .2; z < Wz / 2 - .1; z += .16) [-1, 1].forEach(s => wood.push(new THREE.CylinderGeometry(.018, .022, RH - .04, 8).translate(s * (Wx / 2 - .03), H + RH / 2, z)));
      const tbl = [new THREE.BoxGeometry(1.35, .05, .85).translate(0, H + .3, 0)]; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => tbl.push(new THREE.BoxGeometry(.06, .28, .06).translate(a * .6, H + .15, b * .36)));
      put(merge(wood.concat(tbl)), M.wood, spots, (s, o) => place(s, o, 0, 0, 0), true);
      put(new THREE.PlaneGeometry(Wx - .12, Wz - .12).rotateX(-Math.PI / 2).translate(0, H + .035, 0), M.carpet, spots, (s, o) => place(s, o, 0, 0, 0));
      // дюшеки по краям и подушки у перил
      const mats = merge([new THREE.BoxGeometry(Wx - .2, .08, .5).translate(0, H + .075, Wz / 2 - .34), new THREE.BoxGeometry(Wx - .2, .08, .45).translate(0, H + .075, -Wz / 2 + .3), ...[-1, 1].map(s => new THREE.BoxGeometry(.45, .08, Wz - 1.05).translate(s * (Wx / 2 - .3), H + .075, 0))]);
      put(mats, M.dushek, spots, (s, o) => place(s, o, 0, 0, 0), true);
      const cush = merge([...[-.7, 0, .7].map(x => new THREE.CylinderGeometry(.11, .11, .55, 16).rotateZ(Math.PI / 2).translate(x, H + .23, Wz / 2 - .14)), ...[-1, 1].map(s => new THREE.CylinderGeometry(.11, .11, .55, 16).rotateX(Math.PI / 2).translate(s * (Wx / 2 - .14), H + .23, 0))]);
      put(cush, M.cushion, spots, (s, o) => place(s, o, 0, 0, 0), true);
      // низкий столик: сачак и еда
      put(new THREE.PlaneGeometry(1.5, 1.0).rotateX(-Math.PI / 2).translate(0, H + .33, 0), M.sachak, spots, (s, o) => place(s, o, 0, 0, 0));
      const T0 = H + .335, sadaka = state.event === 'sadaka', each = (arr) => { const out = []; spots.forEach(sp => arr.forEach(a => out.push([sp, a]))); return out; };
      const at = ([sp, [lx, lz]], o, ly = 0) => place(sp, o, lx, T0 + ly, lz);
      const seatsL = [[-.45, .33], [0, .33], [.45, .33], [-.45, -.33], [0, -.33], [.45, -.33], [-.58, 0], [.58, 0]];
      put(new THREE.CylinderGeometry(.1, .08, .015, 24), M.plate, each(seatsL), (a, o) => at(a, o, .008));
      if (sadaka) { put(L2([[.001, 0], [.04, 0], [.07, .04], [.078, .055]], 20), M.kase, each(seatsL), (a, o) => at(a, o, .015)); put(new THREE.CircleGeometry(.068, 18).rotateX(-Math.PI / 2).translate(0, .05, 0), M.dograma, each(seatsL), (a, o) => at(a, o, .015)); }
      put(new THREE.CylinderGeometry(.24, .2, .022, 32).scale(1.2, 1, .8), M.plate, each([[0, 0]]), (a, o) => at(a, o, .011));
      put(new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2).scale(.24, .08, .15), M.palow, each([[0, 0]]), (a, o) => at(a, o, .022));
      put(new THREE.CylinderGeometry(.11, .115, .032, 28), M.chorek, each([[-.33, .1], [.33, -.1]]), (a, o) => at(a, o, .016));
      put(new THREE.CylinderGeometry(.1, .08, .02, 24), M.plate, each([[-.33, -.12], [.33, .12]]), (a, o) => at(a, o, .01));
      put(new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2).scale(.08, .04, .08), M.salad, each([[-.33, -.12], [.33, .12]]), (a, o) => at(a, o, .02));
      const fr = []; spots.forEach(sp => { for (let k = 0; k < 7; k++) fr.push([sp, [.18 + (rnd() - .5) * .12, .22 + (rnd() - .5) * .1], k]); });
      const fm = put(new THREE.SphereGeometry(.032, 12, 8), M.fruit, fr, ([sp, l, k], o) => at([sp, l], o, .03 + (k % 2) * .02)); { const c = new THREE.Color(), cols = ['#b8202a', '#e6c04a', '#7a2a5a', '#5b8a2a', '#d94a2a']; for (let i = 0; i < fm.count; i++) fm.setColorAt(i, c.set(cols[i % 5]).convertSRGBToLinear()); fm.instanceColor.needsUpdate = true; }
      const pot = merge([new THREE.SphereGeometry(.07, 18, 12).scale(1, .82, 1).translate(0, .06, 0), new THREE.CylinderGeometry(.028, .032, .03, 14).translate(0, .12, 0), new THREE.SphereGeometry(.016, 8, 6).translate(0, .145, 0), rod(V(.06, .055, 0), V(.11, .11, 0), .01, 6), new THREE.TorusGeometry(.037, .008, 6, 14, Math.PI).rotateZ(-Math.PI / 2).translate(-.07, .065, 0)]);
      put(pot, M.teapot, each([[-.18, -.24]]), (a, o) => { at(a, o); o.rotation.y += .7; });
      put(L2([[.001, 0], [.02, 0], [.042, .028], [.046, .042]], 16), M.kase, each([[-.02, -.26], [.1, -.26]]), (a, o) => at(a, o));
    }
    function buildTables(g, D, kind) { if (kind === 'topchan') return buildTopchans(g, D); const floor = kind === 'floor';
      const n = Math.ceil(D.guests / 20), slots = [];
      D.lines.forEach(z => { for (let k = 0; k < D.nx; k++) slots.push([D.x0 + 3 + k * 6.4, z]); });
      slots.sort((a, b) => (a[0] - b[0]) * .25 + (Math.abs(a[1]) - Math.abs(b[1])));
      const tables = slots.slice(0, n); D.tables = tables;
      const d = new THREE.Object3D(), Y = .12, seats = [];
      if (!floor) {
      const top = new THREE.BoxGeometry(6, .04, 1.0).translate(0, .76, 0), skirt = (() => { const geo = new THREE.BoxGeometry(6.04, .74, 1.04, 60, 1, 10); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), k = (.37 - y) / .74; if (Math.abs(z) > .5) p.setZ(i, z + Math.sin(x * 14) * .02 * k); if (Math.abs(x) > 3) p.setX(i, x + Math.sin(z * 14) * .02 * k); } geo.computeVertexNormals(); geo.translate(0, .37, 0); return geo; })();
      const tm = new THREE.InstancedMesh(merge([top, skirt]), M.cloth, tables.length); tm.castShadow = tm.receiveShadow = true;
      const rm = new THREE.InstancedMesh(new THREE.BoxGeometry(6.08, .012, .34).translate(0, .785, 0), state.premium ? M.runnerGold : M.runnerRed, tables.length);
      const sh = new THREE.InstancedMesh(new THREE.PlaneGeometry(7.4, 2.8).rotateX(-Math.PI / 2), M.contact, tables.length);
      tables.forEach(([x, z], i) => { d.position.set(x, Y, z); d.updateMatrix(); tm.setMatrixAt(i, d.matrix); rm.setMatrixAt(i, d.matrix); d.position.y = Y + .008; d.updateMatrix(); sh.setMatrixAt(i, d.matrix); });
      g.add(sh, tm, rm);
      tables.forEach(([x, z]) => { for (let k = 0; k < 10; k++) { const sx = x - 2.7 + k * .6; seats.push([sx, z + .82, Math.PI], [sx, z - .82, 0]); } });
      const chair = merge([new THREE.BoxGeometry(.46, .1, .46).translate(0, .47, 0), new THREE.BoxGeometry(.46, .62, .07).translate(0, .82, -.2), new THREE.CylinderGeometry(.035, .035, .46, 8).rotateZ(Math.PI / 2).translate(0, 1.13, -.2), new THREE.CylinderGeometry(.27, .31, .45, 24, 1, true).translate(0, .22, 0)]);
      const cm = new THREE.InstancedMesh(chair, state.premium ? M.coverWhite : M.coverRed, seats.length); cm.castShadow = true;
      const bows = state.premium ? new THREE.InstancedMesh(new THREE.BoxGeometry(.5, .1, .02).translate(0, .78, -.24), M.sash, seats.length) : null;
      seats.forEach(([x, z, r], i) => { d.position.set(x, Y, z); d.rotation.set(0, r, 0); d.updateMatrix(); cm.setMatrixAt(i, d.matrix); if (bows) bows.setMatrixAt(i, d.matrix); });
      g.add(cm); if (bows) g.add(bows);
      } else {
        const sach = new THREE.InstancedMesh(new THREE.PlaneGeometry(6, .95).rotateX(-Math.PI / 2), M.sachak, tables.length), mat = new THREE.InstancedMesh(new THREE.BoxGeometry(6.2, .09, .72), M.dushek, tables.length * 2);
        tables.forEach(([x, z], i) => { d.position.set(x, Y + .012, z); d.rotation.set(0, 0, 0); d.updateMatrix(); sach.setMatrixAt(i, d.matrix); [-1, 1].forEach((s, k) => { d.position.set(x, Y + .045, z + s * .98); d.updateMatrix(); mat.setMatrixAt(i * 2 + k, d.matrix); }); });
        mat.receiveShadow = true; g.add(sach, mat);
        tables.forEach(([x, z]) => { for (let k = 0; k < 10; k++) { const sx = x - 2.7 + k * .6; seats.push([sx, z + .98, Math.PI], [sx, z - .98, 0]); } });
        const cu = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .12, .5, 18).rotateZ(Math.PI / 2), M.cushion, seats.length); cu.castShadow = true;
        seats.forEach(([x, z, r], i) => { d.position.set(x, Y + .2, z + (r ? .28 : -.28)); d.rotation.set(0, 0, 0); d.updateMatrix(); cu.setMatrixAt(i, d.matrix); }); g.add(cu);
      }
      const sadaka = state.event === 'sadaka', Ytab = floor ? Y + .016 : Y + .785, plateIn = floor ? .66 : .55;
      const plate = new THREE.CylinderGeometry(.13, .1, .018, 28), glassG = L2([[.001, 0], [.032, 0], [.036, .11], [.033, .12]], 16), bowlG = L2([[.001, 0], [.05, 0], [.09, .05], [.1, .07], [.095, .072]], 24), dogrG = new THREE.CircleGeometry(.088, 20).rotateX(-Math.PI / 2).translate(0, .06, 0);
      const pm = new THREE.InstancedMesh(plate, M.plate, seats.length), gm = new THREE.InstancedMesh(glassG, M.glass, seats.length), bm = sadaka ? new THREE.InstancedMesh(bowlG, M.kase, seats.length) : null, dm = sadaka ? new THREE.InstancedMesh(dogrG, M.dograma, seats.length) : null;
      seats.forEach(([x, z, r], i) => { const tz = z + (r ? -plateIn : plateIn); d.rotation.set(0, 0, 0); d.position.set(x, Ytab + .005, tz); d.updateMatrix(); pm.setMatrixAt(i, d.matrix); if (bm) { d.position.y += .012; d.updateMatrix(); bm.setMatrixAt(i, d.matrix); dm.setMatrixAt(i, d.matrix); } d.position.set(x + .17, Ytab, tz + (r ? .1 : -.1)); d.updateMatrix(); gm.setMatrixAt(i, d.matrix); });
      g.add(pm, gm); if (bm) g.add(bm, dm);
      const it = { palow: [], salad: [], fruitPlate: [], fruits: [], chorek: [], bottle: [], teapot: [], kase: [], sweets: [], sweetBits: [] };
      tables.forEach(([x, z]) => {
        (sadaka ? [-1.6, 1.6] : [-2.0, 0, 2.0]).forEach(dx => it.palow.push([x + dx, z]));
        [-1.0, 1.0, -2.75, 2.75].forEach(dx => it.salad.push([x + dx, z + (dx > 0 ? .18 : -.18)]));
        if (!sadaka) [-1.0, 1.0].forEach(dx => { it.fruitPlate.push([x + dx + .45, z - .2]); for (let k = 0; k < 9; k++) it.fruits.push([x + dx + .45 + (rnd() - .5) * .16, z - .2 + (rnd() - .5) * .16, k]); });
        [-.5, .5, 2.4, -2.4].forEach(dx => it.chorek.push([x + dx, z + .2]));
        if (!sadaka) [-1.5, -1.42, 1.5, 1.42].forEach((dx, k) => it.bottle.push([x + dx, z + (k % 2 ? .1 : -.08), k]));
        [-.25, 2.8].forEach(dx => { it.teapot.push([x + dx, z - .22]); for (let k = 0; k < 3; k++) it.kase.push([x + dx + .18 + k * .13, z - .3]); });
        [.5, -2.4].forEach(dx => { it.sweets.push([x + dx + .3, z - .2]); for (let k = 0; k < 12; k++) it.sweetBits.push([x + dx + .3 + (rnd() - .5) * .14, z - .2 + (rnd() - .5) * .14]); });
      });
      const put = (list, geo, mat, fn) => { if (!list.length) return null; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((a, i) => { d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.setScalar(1); fn(a, d); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); g.add(im); return im; };
      const tint = (im, cols) => { if (!im) return; const c = new THREE.Color(); for (let i = 0; i < im.count; i++) im.setColorAt(i, c.set(cols[i % cols.length]).convertSRGBToLinear()); im.instanceColor.needsUpdate = true; };
      put(it.palow, new THREE.CylinderGeometry(.27, .22, .025, 36).scale(1.25, 1, .85), M.plate, ([x, z], o) => o.position.set(x, Ytab + .012, z));
      put(it.palow, new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, Math.PI / 2).scale(.27, .09, .17), M.palow, ([x, z], o) => o.position.set(x, Ytab + .025, z));
      put(it.salad, new THREE.CylinderGeometry(.13, .1, .02, 28), M.plate, ([x, z], o) => o.position.set(x, Ytab + .01, z));
      put(it.salad, new THREE.SphereGeometry(1, 18, 8, 0, TAU, 0, Math.PI / 2).scale(.1, .05, .1), M.salad, ([x, z], o) => o.position.set(x, Ytab + .02, z));
      put(it.fruitPlate, new THREE.CylinderGeometry(.16, .12, .025, 28), M.plate, ([x, z], o) => o.position.set(x, Ytab + .012, z));
      tint(put(it.fruits, new THREE.SphereGeometry(.035, 12, 8), M.fruit, ([x, z, k], o) => { o.position.set(x, Ytab + .055 + (k % 3) * .02, z); o.scale.setScalar(k % 4 === 0 ? 1.4 : 1); }), ['#b8202a', '#d94a2a', '#e6c04a', '#7a2a5a', '#5b8a2a', '#c92f3a']);
      put(it.chorek, new THREE.CylinderGeometry(.12, .125, .035, 32), M.chorek, ([x, z], o) => o.position.set(x, Ytab + .02, z));
      put(it.chorek, new THREE.CylinderGeometry(.12, .125, .035, 32), M.chorek, ([x, z], o) => { o.position.set(x + .02, Ytab + .055, z - .01); o.rotation.set(.05, 0, .04); });
      tint(put(it.bottle, merge([new THREE.CylinderGeometry(.04, .04, .22, 16).translate(0, .11, 0), new THREE.CylinderGeometry(.015, .04, .08, 16).translate(0, .26, 0), new THREE.CylinderGeometry(.016, .016, .02, 12).translate(0, .31, 0)]), M.bottle, ([x, z], o) => o.position.set(x, Ytab, z)), ['#d2691e', '#7a1a14', '#e3a13a', '#2f6b2a']);
      const pot = merge([new THREE.SphereGeometry(.075, 18, 12).scale(1, .82, 1).translate(0, .065, 0), new THREE.CylinderGeometry(.03, .035, .03, 14).translate(0, .13, 0), new THREE.SphereGeometry(.018, 8, 6).translate(0, .155, 0), rod(V(.065, .06, 0), V(.12, .12, 0), .011, 6), new THREE.TorusGeometry(.04, .009, 6, 14, Math.PI).rotateZ(-Math.PI / 2).translate(-.075, .07, 0)]);
      put(it.teapot, pot, M.teapot, ([x, z], o) => { o.position.set(x, Ytab, z); o.rotation.set(0, .6, 0); });
      put(it.kase, L2([[.001, 0], [.022, 0], [.045, .03], [.05, .045], [.047, .046]], 18), M.kase, ([x, z], o) => o.position.set(x, Ytab, z));
      put(it.sweets, new THREE.CylinderGeometry(.12, .09, .03, 24), M.gold, ([x, z], o) => o.position.set(x, Ytab + .015, z));
      tint(put(it.sweetBits, new THREE.BoxGeometry(.03, .018, .045), M.sweet, ([x, z], o) => { o.position.set(x, Ytab + .04, z); o.rotation.set(0, rnd() * TAU, 0); }), ['#e94e6a', '#f2c94c', '#6fcf97', '#ffffff', '#9b51e0', '#f2994a']);
    }

    // ---------- сцена и стол молодых (той) / скромно (садака) ----------
    function buildStage(g, D) {
      const { A } = D; D.headX = -A + 2.6; D.headY = .12;
      if (state.event === 'sadaka') { const t = new THREE.Mesh(new THREE.BoxGeometry(1.0, .76, 3.0), M.cloth); t.position.set(-A + 2.4, .5, 0); t.castShadow = true; g.add(t);
        const bd = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.4).rotateY(Math.PI / 2), M.drape); bd.position.set(-A + .15, 1.35, 0); g.add(bd); return; }
      const st = state.stage ? .5 : 0, y0 = .12 + st;
      if (state.stage) { const p = new THREE.Mesh(new THREE.BoxGeometry(5.0, st, 9.0), M.stage); p.position.set(-A + 2.5, .12 + st / 2, 0); p.receiveShadow = true; g.add(p); const top = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 8.9).rotateX(-Math.PI / 2), M.runnerRed); top.position.set(-A + 2.5, .12 + st + .005, 0); g.add(top); const edge = new THREE.Mesh(new THREE.BoxGeometry(.04, .05, 9), M.gold); edge.position.set(-A + 5, .12 + st, 0); g.add(edge); }
      const bd = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.4).rotateY(Math.PI / 2), M.backdrop); bd.position.set(-A + .12, y0 + 1.7, 0); g.add(bd);
      [-1, 1].forEach(s => { const c = new THREE.PlaneGeometry(1.2, 3.4, 14, 1); const p = c.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 16) * .06); c.computeVertexNormals(); c.rotateY(Math.PI / 2); const m = new THREE.Mesh(c, M.drape); m.position.set(-A + .2, y0 + 1.7, s * 4.6); g.add(m); });
      const hx = -A + 2.6; const t = new THREE.Mesh(new THREE.BoxGeometry(.9, .76, 3.0), M.cloth); t.position.set(hx, y0 + .38, 0); t.castShadow = true; g.add(t);
      const ru = new THREE.Mesh(new THREE.BoxGeometry(.94, .02, .5), M.runnerGold); ru.position.set(hx, y0 + .77, 0); g.add(ru);
      const sofa = new THREE.Group(); [[.75, .42, 2.0, 0, .21, 0], [.2, .7, 2.1, -.36, .62, 0], [.75, .3, .18, 0, .55, 1.0], [.75, .3, .18, 0, .55, -1.0]].forEach(([w, h, dd, x, y, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), M.sofa); m.position.set(x, y, z); m.castShadow = true; sofa.add(m); }); sofa.position.set(hx - 1.0, y0, 0); g.add(sofa);
      const tp = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12).scale(1, .82, 1), M.teapot); tp.position.set(hx, y0 + .84, -.6); g.add(tp);
      const ck = new THREE.Mesh(new THREE.CylinderGeometry(.14, .15, .04, 32), M.chorek); ck.position.set(hx, y0 + .8, .6); g.add(ck);
      [-1, 1].forEach(s => { const sp = new THREE.Mesh(new THREE.BoxGeometry(.45, 1.1, .45), M.dark); sp.position.set(-A + 4.4, y0 + .55, s * 3.9); sp.castShadow = true; g.add(sp); const stand = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.2, 8), M.dark); stand.position.set(-A + 4.4, y0 + 1.7, s * 3.9); g.add(stand); const top = new THREE.Mesh(new THREE.BoxGeometry(.4, .6, .4), M.dark); top.position.set(-A + 4.4, y0 + 2.5, s * 3.9); g.add(top); });
      const spot = new THREE.SpotLight(lin('#ffd9a3'), 1.5, 16, .55, .6, 2); spot.position.set(hx + 6, 4.6, 0); spot.target.position.set(hx - .6, y0 + .6, 0); g.add(spot, spot.target); warm.push(spot);
      D.headY = y0;
      if (state.led) [-1, 1].forEach(s => { const sc = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.46), M.led); sc.position.set(-A + 3.8, y0 + 2.2, s * 5.6); sc.rotation.y = Math.PI / 2 + s * -.5; g.add(sc); const fr = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.56, .06), M.dark); fr.position.copy(sc.position); fr.rotation.copy(sc.rotation); fr.translateZ(-.04); g.add(fr); ledMesh.push(sc); });
      if (state.aisle) { const r = new THREE.Mesh(new THREE.PlaneGeometry(2 * A - 5.5, 1.6).rotateX(-Math.PI / 2), M.runnerRed); r.position.set(2.75, .13, 0); g.add(r); }
    }

    function makeViews(D1, D2, D3, Y) { const h = 1.62, o1 = D1.oz, o2 = D2.oz, o3 = D3.oz, A = Math.max(D1.A, D2.A, D3.A);
      const pick = (D, k) => D.tables.length ? D.tables[Math.min(k, D.tables.length - 1)] : [0, 2.4];
      const tb = pick(D1, 2), fb = pick(D2, 1), cb = pick(D3, 1);
      const door = (D) => V(D.A + 3.5, 1.7, D.oz + D.doorZ);
      return {
        outside: { pos: V(A + 36, 17, Y.zc + Y.B + 8), look: V(A * .25, 1.2, Y.zc), fov: 46, outside: true, tent: 0 },
        entrance: { pos: V(D1.A - .9, h, o1 + D1.doorZ), look: V(-D1.A, 1.5, o1 + D1.doorZ * .2), fov: 62, tent: 1, door: door(D1) },
        center: { pos: V(D1.A * .25, h, o1 + .6), look: V(-D1.A, 2.0, o1 - .3), fov: 64, tent: 1, door: door(D1) },
        head: { pos: V(D1.headX + 7, h + .1, o1 - 2.6), look: V(D1.headX - .8, D1.headY + 1.0, o1 + .8), fov: 55, tent: 1, door: door(D1) },
        guest: { pos: V(tb[0] - .9, 1.2, o1 + tb[1] + (tb[1] > 0 ? .82 : -.82)), look: V(tb[0] + 1.2, .9, o1 + tb[1] * .5), fov: 58, tent: 1, door: door(D1) },
        floor: { pos: V(D2.A - 1.2, h, o2 + .4), look: V(-D2.A, .8, o2 - .2), fov: 64, tent: 2, door: door(D2) },
        floorSeat: { pos: V(fb[0] - 2.4, .92, o2 + fb[1] + (fb[1] > 0 ? .98 : -.98)), look: V(fb[0] + 1.6, .3, o2 + fb[1]), fov: 60, tent: 2, door: door(D2) },
        topchan: { pos: V(D3.A - 1.2, h, o3 + .4), look: V(-D3.A, .8, o3 - .2), fov: 64, tent: 3, door: door(D3) },
        topchanSeat: { pos: V(cb[0] - .35, 1.32, o3 + cb[1] + (cb[1] > 0 ? .8 : -.8)), look: V(cb[0] + .9, .55, o3 + cb[1] * .05), fov: 66, tent: 3, door: door(D3) },
        roof: { pos: V(0, 1.3, o1 - D1.B * .5), look: V(0, 6, o1 - D1.B * .1), fov: 70, tent: 1, door: door(D1) },
      }; }
    function makeHotspots(D1, D2, D3) { const hs = [], sadaka = state.event === 'sadaka', o1 = D1.oz, o2 = D2.oz, o3 = D3.oz, D = D1;
      const pick = (Dx, k) => Dx.tables[Math.min(k, Dx.tables.length - 1)] || [0, 2.4]; const t = pick(D1, 1), f = pick(D2, 1), c = pick(D3, 1);
      const P = (x, y, z, o) => V(x, y, z + o);
      hs.push({ id: 'tent', pos: P(-D.A + MOD * 1.5, D.APEX - .9, -D.B + MOD * .5, o1), t: 'Шатёр-пагода', d: 'Модули 5 × 5 м собираются в зал нужного размера. Белые стены с арочными окнами.', tag: 'входит' });
      hs.push({ id: 'palow', pos: P(t[0], 1.1, t[1], o1), t: sadaka ? 'Дограма и плов' : 'Плов на каждом столе', d: sadaka ? 'Дограма в пиале у каждого гостя, плов на блюдах, чурек и чай.' : 'Плов на больших блюдах, салаты, фрукты, чурек, сладости, чай.', tag: 'по меню' });
      hs.push({ id: 'chairs', pos: P(t[0] - 1.8, 1.25, t[1] + (t[1] > 0 ? .82 : -.82), o1), t: state.premium ? 'Белые чехлы с золотом' : 'Бордовые чехлы', d: 'Шатёр со столами: длинные столы на 20 гостей, стулья в чехлах.', tag: state.premium ? 'Премиум' : 'входит' });
      hs.push({ id: 'carpet', pos: P(D.A * .5, .25, -D.B + 1.4, o1), t: 'Туркменские ковры', d: 'Пол застелен коврами — тепло и празднично.', tag: 'входит' });
      hs.push({ id: 'light', pos: P(-D.A + MOD * 2.5, 3.6, -D.B + MOD * 1.5, o1), t: state.premium ? 'Хрустальные люстры' : 'Светильники и гирлянды', d: 'Свет под каждым куполом, гирлянды вдоль стыков.', tag: state.premium ? 'Премиум' : 'входит' });
      if (state.event === 'gelin') hs.push({ id: 'gelin', pos: P(D.A - .3, 2.2, D.doorZ, o1), t: 'Гелин алыжы', d: 'Невесту привозят из дома родителей. У входа — красная дорожка и цветочная арка.', tag: 'встреча невесты' });
      if (!sadaka) hs.push({ id: 'head', pos: P(D.headX - .4, D.headY + 1.4, 0, o1), t: 'Стол молодых', d: 'Диван, бархатный задник с надписью «Toýuňyz gutly bolsun!», колонки для музыки.', tag: state.stage ? 'сцена +3 000' : 'входит' });
      if (state.led && !sadaka) hs.push({ id: 'led', pos: P(-D.A + 3.8, D.headY + 2.2, 5.6, o1), t: 'LED-экраны', d: 'Поздравления, фото и видео на двух экранах.', tag: '+6 000' });
      if (state.ac) hs.push({ id: 'ac', pos: P(-D.A + MOD * .5, 1.9, D.B - .4, o1), t: 'Кондиционеры', d: 'Летом прохладно, зимой тепло.', tag: '+5 000' });
      hs.push({ id: 'sachak', pos: P(f[0] + .8, .45, f[1], o2), t: 'Сачак на полу', d: 'Второй шатёр: гости сидят на полу у длинного сачака, еда стоит прямо на скатерти.', tag: 'входит' });
      hs.push({ id: 'dushek', pos: P(f[0] - 1.5, .5, f[1] + (f[1] > 0 ? .98 : -.98), o2), t: 'Дюшеки и подушки', d: 'Мягкие матрасы вдоль сачака и подушка под спину у каждого гостя.', tag: 'входит' });
      hs.push({ id: 'topchan', pos: P(c[0] + 1.0, 1.15, c[1] + (c[1] > 0 ? .95 : -.95), o3), t: 'Деревянный топчан', d: 'Третий шатёр: топчаны с резными перилами на 8 гостей — ковёр, дюшеки, подушки.', tag: 'входит' });
      hs.push({ id: 'lowtable', pos: P(c[0], .95, c[1], o3), t: 'Низкий столик', d: 'Сачак на столике: плов, чурек, салаты, фрукты, чай.', tag: 'по меню' });
      return hs; }

    function rebuild() {
      if (world) { scene.remove(world.g); world.g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
      warm = []; ledMesh = [];
      const g = new THREE.Group(), Ds = split(state.guests), gap = 5, [D1, D2, D3] = Ds;
      let z = 0; Ds.forEach(D => { D.oz = z + D.B; z += 2 * D.B + gap; }); const total = z - gap; Ds.forEach(D => D.oz -= total / 2);
      const Y = { A: Math.max(D1.A, D2.A, D3.A), B: total / 2, zc: 0 };
      buildYard(g, Y);
      const g1 = new THREE.Group(); g1.position.z = D1.oz; buildTent(g1, D1); buildGelin(g1, D1); buildTables(g1, D1, 'tables'); buildStage(g1, D1); g.add(g1);
      [[D2, 'floor'], [D3, 'topchan']].forEach(([D, kind]) => { const gg = new THREE.Group(); gg.position.z = D.oz; buildTent(gg, D); buildTables(gg, D, kind); const bd = new THREE.Mesh(new THREE.PlaneGeometry(2 * D.B - 1, 2.4).rotateY(Math.PI / 2), M.drape); bd.position.set(-D.A + .15, 1.35, 0); gg.add(bd); g.add(gg); });
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex(cnv(256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 70, 128, 128, 128); gr.addColorStop(0, 'rgba(255,190,120,.8)'); gr.addColorStop(1, 'rgba(255,160,80,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); })), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      spill.scale.set(Y.A * 2 + 12, 1, Y.B * 2 + 12); spill.position.set(0, .02, Y.zc); g.add(spill);
      scene.add(g); world = { g, D: D1, D2, D3, Y, spill }; views = makeViews(D1, D2, D3, Y); hotspots = makeHotspots(D1, D2, D3);
    }

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, cam));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), .42, .45, .9); composer.addPass(bloom);
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    renderer.outputEncoding = THREE.LinearEncoding;

    let cur = { pos: V(0, 0, 0), yaw: 0, pitch: 0, fov: 60 }, from = null, to = null, tT = 1, yawOff = 0, pitchOff = 0, vy = 0, vp = 0, viewName = 'outside', fovOff = 0;
    const dirToYP = (pos, look) => { const d = look.clone().sub(pos); return { yaw: Math.atan2(d.x, d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }; };
    let path = null;
    function go(name, instant) { const v = views[name]; if (!v) return; const pv = views[viewName] || {}; viewName = name; const yp = dirToYP(v.pos, v.look);
      from = { pos: cur.pos.clone(), yaw: cur.yaw + yawOff, pitch: cur.pitch + pitchOff, fov: cur.fov }; to = { pos: v.pos.clone(), yaw: yp.yaw, pitch: yp.pitch, fov: v.fov }; tT = (instant || reduce) ? 1 : 0; yawOff = 0; pitchOff = 0; fovOff = 0;
      path = [from.pos.clone()]; if ((pv.tent || 0) !== (v.tent || 0)) { if (pv.tent) path.push(pv.door.clone()); if (v.tent) path.push(v.door.clone()); } path.push(to.pos.clone());
      if (tT >= 1) cur = { pos: to.pos.clone(), yaw: to.yaw, pitch: to.pitch, fov: to.fov }; if (api.onView) api.onView(name); }
    const lerpAng = (a, b, t) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };
    let drag = null, pinch = null;
    canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grab'); });
    canvas.addEventListener('pointermove', (e) => { if (!drag || drag.id !== e.pointerId || pinch) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; const k = (cur.fov + fovOff) / 60 * .0042; vy = -dx * k; vp = dy * k; yawOff += vy; pitchOff = clamp(pitchOff + vp, -1.0 - cur.pitch, 1.25 - cur.pitch); if (api.onInteract) api.onInteract(); });
    const end = () => { drag = null; canvas.classList.remove('grab'); }; canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); fovOff = clamp(fovOff + e.deltaY * .02, -22, 14); }, { passive: false });
    canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
    canvas.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && pinch) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); fovOff = clamp(fovOff - (d - pinch) * .06, -22, 14); pinch = d; } }, { passive: true });
    canvas.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; });

    let W = 1, H = 1;
    function resize() { const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; renderer.setSize(W, H, false); composer.setSize(W, H); bloom.setSize(W / 2, H / 2); cam.aspect = W / H; cam.updateProjectionMatrix(); }
    new ResizeObserver(resize).observe(canvas);

    let visible = true, last = performance.now();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(loop); }).observe(canvas);
    const look = V(0, 0, 0), proj = V(0, 0, 0);
    function loop(now) {
      if (!visible) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000, D = world.D;
      if (tT < 1) { tT = Math.min(1, tT + dt / 1.6); const k = ease(tT);
        if (path && path.length > 2) { const seg = []; let total = 0; for (let i = 1; i < path.length; i++) { const l = path[i].distanceTo(path[i - 1]); seg.push(l); total += l; } let dd = k * total, i = 0; while (i < seg.length - 1 && dd > seg[i]) { dd -= seg[i]; i++; } cur.pos.copy(path[i]).lerp(path[i + 1], seg[i] ? clamp(dd / seg[i]) : 1); } else cur.pos.copy(from.pos).lerp(to.pos, k);
        cur.yaw = lerpAng(from.yaw, to.yaw, k); cur.pitch = from.pitch + (to.pitch - from.pitch) * k; cur.fov = from.fov + (to.fov - from.fov) * k; }
      if (!drag) { yawOff += vy; vy *= .9; pitchOff = clamp(pitchOff + vp, -1.0 - cur.pitch, 1.25 - cur.pitch); vp *= .9; }
      const outsideView = views[viewName] && views[viewName].outside && tT >= 1;
      if (outsideView) { const v = views.outside, cx = v.look.x, cz = v.look.z, r = Math.hypot(v.pos.x - cx, v.pos.z - cz) * (W < 760 ? 1.6 : 1), a0 = Math.atan2(v.pos.z - cz, v.pos.x - cx) + (reduce ? 0 : Math.sin(t * .05) * .35) + yawOff * .6; cam.position.set(cx + Math.cos(a0) * r, v.pos.y + pitchOff * 3, cz + Math.sin(a0) * r); cam.lookAt(v.look); if (W < 760) cam.setViewOffset(W, H, 0, H * .16, W, H); else cam.setViewOffset(W, H, -W * .17, 0, W, H); }
      else { if (cam.view && cam.view.enabled) cam.clearViewOffset(); cam.position.copy(cur.pos); const yw = cur.yaw + yawOff, pt = clamp(cur.pitch + pitchOff, -1.0, 1.25); look.set(cur.pos.x + Math.sin(yw) * Math.cos(pt), cur.pos.y + Math.sin(pt), cur.pos.z + Math.cos(yw) * Math.cos(pt)); cam.lookAt(look); }
      cam.fov = clamp(cur.fov + fovOff, 30, 80); cam.updateProjectionMatrix();
      const inT = (Dx) => Math.abs(cam.position.x) < Dx.A * 1.01 && Math.abs(cam.position.z - Dx.oz) < Dx.B * 1.01; const outside = cam.position.y > 6 || !(inT(D) || inT(world.D2) || inT(world.D3));
      const glow = outside ? 1.0 : .14; M.pvc.emissiveIntensity += (glow - M.pvc.emissiveIntensity) * .1; M.wall.emissiveIntensity += (glow * .9 - M.wall.emissiveIntensity) * .1; world.spill.material.opacity = outside ? .5 : 0;
      if (ledMesh.length) { drawLED(T.ledCanvas, t); T.led.needsUpdate = true; }
      composer.render();
      if (api.onHotspots) api.onHotspots(hotspots.map(h => { proj.copy(h.pos).project(cam); return { id: h.id, x: (proj.x + 1) / 2 * W, y: (1 - proj.y) / 2 * H, vis: proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05 && !outside, t: h.t, d: h.d, tag: h.tag }; }));
      requestAnimationFrame(loop);
    }
    const api = {
      setState(s) { const key = () => split(state.guests).map(d => d.cols + 'x' + d.rows).join(); const prev = key(); Object.assign(state, s); const keep = viewName, before = { pos: cur.pos.clone(), yaw: cur.yaw, pitch: cur.pitch, fov: cur.fov, yo: yawOff, po: pitchOff };
        rebuild(); const same = key() === prev;
        if (same) { cur = { pos: before.pos, yaw: before.yaw, pitch: before.pitch, fov: before.fov }; yawOff = before.yo; pitchOff = before.po; } else go(keep, true); },
      go, get view() { return viewName; }, get dims() { return world && world.D; },
    };
    rebuild(); resize(); go('outside', true); requestAnimationFrame(loop);
    return api;
  }
  window.ToyScene = { init, tierFor, split };
})();
