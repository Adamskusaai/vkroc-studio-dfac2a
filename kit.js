// Low-poly modern-Scandi kit (procedural, 1:1 FUR sizes). Prem5: rounded edges, AO, dollhouse contrast.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const cache = new Map();
let ready = null;

function std(c, rough = 0.7, metal = 0) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: rough, metalness: metal });
}

function rbox(w, h, d, r = 0.04, seg = 2) {
  const rr = Math.min(r, Math.min(w, h, d) * 0.45);
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

function box(g, mat, x, y, z, w, h, d, round = 0.03) {
  const geo = round > 0 ? rbox(w, h, d, round) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}

function cyl(g, mat, x, y, z, rT, rB, h, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}

/** Soft contact shadow (AO-ish) under piece — cheap dark plane, no extra lights */
function ao(g, w, d, y = 0.012) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.92, d * 0.92),
    new THREE.MeshBasicMaterial({ color: 0x1a1814, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, Math.max(y, 0.018), 0);
  m.receiveShadow = false;
  m.castShadow = false;
  g.add(m);
  return m;
}

function artMap() {
  if (cache.has('artTex')) return cache.get('artTex');
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#e8e0d4'; x.fillRect(0, 0, 256, 256);
  const cols = ['#c4a882', '#8a6a4a', '#6b7d8a', '#d4c4a8', '#5a7060'];
  for (let i = 0; i < 7; i++) {
    x.fillStyle = cols[i % cols.length];
    const a = 20 + Math.random() * 180, b = 20 + Math.random() * 180;
    x.globalAlpha = 0.55 + Math.random() * 0.35;
    x.beginPath();
    x.moveTo(a, b);
    x.bezierCurveTo(a + 80, b - 40, a + 120, b + 90, a + 40, b + 140);
    x.bezierCurveTo(a - 20, b + 100, a - 10, b + 20, a, b);
    x.fill();
  }
  x.globalAlpha = 1;
  x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(0, 0, 256, 18);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set('artTex', t);
  return t;
}

export async function loadKit() {
  if (ready) return ready;
  ready = Promise.resolve();
  await ready;
  return ready;
}

function proc(type, F, cols) {
  const g = new THREE.Group();
  const wood = std(cols.wood || '#c4a07a', 0.55);
  const fab = std(cols.fab || F.c || '#7a6854', 0.88);
  const white = std('#f4f1ec', 0.7);
  const dark = std('#2a2c2e', 0.45, 0.2);
  const metal = std('#b8bcc0', 0.35, 0.55);
  const { w, d, h } = F;

  if (type === 'bed' || type === 'bed1') {
    ao(g, w + 0.15, d + 0.15);
    box(g, wood, 0, 0.14, 0, w, 0.22, d, 0.04);
    box(g, std('#f2ebe3', 0.92), 0, 0.34, 0.02, w - 0.1, 0.12, d - 0.14, 0.05);
    box(g, wood, 0, 0.5, -d / 2 + 0.05, w, 0.65, 0.07, 0.03);
    const duvet = std(cols.bed || '#5e4330', 0.9);
    box(g, duvet, 0, 0.46, d * 0.08, w - 0.12, 0.14, d * 0.68, 0.06);
    const pw = type === 'bed' ? w * 0.34 : w * 0.48;
    box(g, std('#f5eee6', 0.95), type === 'bed' ? -w * 0.2 : 0, 0.56, -d / 2 + 0.3, pw, 0.12, 0.32, 0.05);
    if (type === 'bed') box(g, std('#f5eee6', 0.95), w * 0.2, 0.56, -d / 2 + 0.3, pw, 0.12, 0.32, 0.05);
    box(g, wood, -w / 2 - 0.28, 0.22, -d / 2 + 0.35, 0.38, 0.44, 0.38, 0.04);
    if (type === 'bed') box(g, wood, w / 2 + 0.28, 0.22, -d / 2 + 0.35, 0.38, 0.44, 0.38, 0.04);
    cyl(g, std('#f5e6c8', 0.4), -w / 2 - 0.28, 0.62, -d / 2 + 0.35, 0.055, 0.055, 0.22, 6);
  } else if (type === 'bunk') {
    // bunk bed: 4 posts, two decks, guard rail on top, ladder at the foot end
    ao(g, w + 0.1, d + 0.1);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, wood, (a * (w - 0.06)) / 2, h / 2, (b * (d - 0.06)) / 2, 0.06, h, 0.06, 0.01));
    const duvet = std(cols.bed || '#5e4330', 0.9), sheet = std('#f2ebe3', 0.92), pil = std('#f5eee6', 0.95);
    [0.2, 1.15].forEach((y) => {
      box(g, wood, 0, y, 0, w, 0.08, d, 0.02);
      box(g, sheet, 0, y + 0.1, 0, w - 0.1, 0.12, d - 0.1, 0.04);
      box(g, duvet, 0, y + 0.19, d * 0.1, w - 0.12, 0.07, d * 0.66, 0.04);
      box(g, pil, 0, y + 0.22, -d / 2 + 0.25, w * 0.5, 0.1, 0.28, 0.04);
    });
    // local -x = open (room) side with ladder at the foot, +x = wall side with full guard rail
    box(g, wood, -w / 2 + 0.03, 1.45, -d * 0.12, 0.04, 0.12, d * 0.7, 0.01);
    box(g, wood, w / 2 - 0.03, 1.45, 0, 0.04, 0.12, d - 0.1, 0.01);
    for (let i = 0; i < 5; i++) box(g, wood, -w / 2 + 0.03, 0.35 + i * 0.25, d / 2 - 0.25, 0.04, 0.03, 0.36, 0);
    box(g, wood, -w / 2 + 0.03, 0.85, d / 2 - 0.08, 0.04, 1.3, 0.04, 0);
    box(g, wood, -w / 2 + 0.03, 0.85, d / 2 - 0.42, 0.04, 1.3, 0.04, 0);
  } else if (type === 'sofa') {
    ao(g, w + 0.1, d + 0.1);
    const linen = std(cols.fab || '#6e5c4a', 0.9);
    box(g, wood, 0, 0.04, 0, w - 0.1, 0.06, d - 0.1, 0.02);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
      box(g, wood, (a * w) / 2 - a * 0.12, 0.08, (b * d) / 2 - b * 0.1, 0.05, 0.14, 0.05, 0.01)
    );
    box(g, linen, 0, 0.28, 0.02, w - 0.1, 0.28, d - 0.14, 0.05);
    for (let i = 0; i < 3; i++) {
      const cw = (w - 0.2) / 3 - 0.04;
      box(g, linen, -w / 2 + 0.14 + (i + 0.5) * ((w - 0.2) / 3), 0.48, 0.04, cw, 0.12, d - 0.3, 0.05);
    }
    box(g, linen, 0, 0.58, -d / 2 + 0.1, w - 0.06, 0.42, 0.14, 0.05);
    box(g, linen, -w / 2 + 0.09, 0.48, 0.02, 0.14, 0.36, d - 0.18, 0.04);
    box(g, linen, w / 2 - 0.09, 0.48, 0.02, 0.14, 0.36, d - 0.18, 0.04);
    // throw cushions — colour pop from above
    const ccols = ['#c4785a', '#5a7a8a', '#d4b07a', '#7a5a6a'];
    for (let i = 0; i < 3; i++) {
      box(g, std(ccols[i], 0.95), -w * 0.28 + i * 0.28, 0.62, -d * 0.12, 0.28, 0.18, 0.22, 0.06);
    }
  } else if (type === 'armch') {
    ao(g, w + 0.08, d + 0.08);
    const linen = std(cols.fab || '#7a6854', 0.9);
    box(g, wood, 0, 0.05, 0, w - 0.08, 0.06, d - 0.08, 0.02);
    box(g, linen, 0, 0.28, 0, w - 0.06, 0.28, d - 0.06, 0.05);
    box(g, linen, 0, 0.5, 0, w - 0.14, 0.12, d - 0.18, 0.04);
    box(g, linen, 0, 0.58, -d / 2 + 0.09, w - 0.04, 0.4, 0.12, 0.04);
    box(g, linen, -w / 2 + 0.07, 0.48, 0, 0.11, 0.32, d - 0.12, 0.03);
    box(g, linen, w / 2 - 0.07, 0.48, 0, 0.11, 0.32, d - 0.12, 0.03);
  } else if (type === 'table') {
    ao(g, w * 0.95, d * 0.95);
    box(g, wood, 0, 0.72, 0, w, 0.05, d, 0.02);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
      box(g, wood, (a * w) / 2 - a * 0.1, 0.35, (b * d) / 2 - b * 0.08, 0.045, 0.7, 0.045, 0.01)
    );
  } else if (type === 'ctable') {
    ao(g, w * 0.9, d * 0.9);
    box(g, wood, 0, 0.38, 0, w, 0.04, d, 0.02);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
      box(g, wood, a * (w / 2 - 0.07), 0.18, b * (d / 2 - 0.07), 0.04, 0.36, 0.04, 0.01)
    );
  } else if (type === 'desk') {
    ao(g, w * 0.95, d * 0.95);
    box(g, wood, 0, 0.72, 0, w, 0.045, d, 0.02);
    box(g, wood, -w / 2 + 0.06, 0.36, 0, 0.05, 0.7, d - 0.06, 0.01);
    box(g, wood, w / 2 - 0.06, 0.36, 0, 0.05, 0.7, d - 0.06, 0.01);
    box(g, wood, 0, 0.35, d / 2 - 0.06, w - 0.12, 0.48, 0.04, 0.01);
  } else if (type === 'tv') {
    ao(g, w * 0.9, d * 0.9);
    box(g, wood, 0, 0.22, 0, w, 0.44, d, 0.03);
    box(g, dark, 0, 0.95, -d / 2 + 0.03, w * 0.88, 0.72, 0.04, 0.01);
    box(g, std('#0d0d0f', 0.25), 0, 0.95, -d / 2 + 0.01, w * 0.8, 0.64, 0.02, 0);
  } else if (type === 'ward') {
    ao(g, w + 0.05, d + 0.05);
    box(g, wood, 0, h / 2, 0, w, h, d, 0.03);
    box(g, std('#f3efe8', 0.75), 0, h / 2, d / 2 - 0.01, w - 0.1, h - 0.14, 0.02, 0);
    box(g, wood, 0, h / 2, d / 2 + 0.005, 0.025, h - 0.18, 0.015, 0);
    box(g, metal, -w * 0.18, h * 0.5, d / 2 + 0.02, 0.025, 0.16, 0.02, 0);
    box(g, metal, w * 0.18, h * 0.5, d / 2 + 0.02, 0.025, 0.16, 0.02, 0);
  } else if (type === 'kitch') {
    ao(g, w + 0.08, d + 0.08);
    // light base + dark worktop + upper cabinets (reads from dollhouse top-down)
    box(g, std('#efe8de', 0.75), 0, 0.42, 0, w, 0.84, d, 0.02);
    box(g, dark, 0, 0.05, 0, w - 0.04, 0.1, d - 0.04, 0);
    box(g, std('#2a2c2e', 0.35, 0.2), 0, 0.92, 0, w + 0.12, 0.08, d + 0.14, 0.01);
    if (!F.nu) { // no wall cabinets when the run sits under a window
    box(g, std('#ebe4da', 0.75), 0, 2.1, -d * 0.06, w * 0.98, 0.78, d * 0.7, 0.02);
    // upper cabinet underside shadow band
    box(g, std('#3a3c3e', 0.5), 0, 1.72, -d * 0.06, w * 0.96, 0.04, d * 0.68, 0);
    }
    box(g, metal, -w * 0.28, 0.98, 0, 0.5, 0.04, 0.36, 0);
    box(g, dark, w * 0.28, 0.98, 0, 0.52, 0.04, 0.44, 0);
    for (let i = 0; i < 4; i++)
      cyl(g, dark, w * 0.18 + (i % 2) * 0.2, 1.01, -0.08 + Math.floor(i / 2) * 0.18, 0.07, 0.07, 0.03, 8);
  } else if (type === 'fridge') {
    ao(g, w + 0.04, d + 0.04);
    box(g, std('#d8dce0', 0.35, 0.4), 0, h / 2, 0, w, h, d, 0.03);
    box(g, dark, w / 2 - 0.02, h * 0.55, d / 2 + 0.01, 0.025, 0.45, 0.015, 0);
  } else if (type === 'hooks') {
    // wall coat rail with pegs at 1.7 m and one hanging jacket
    box(g, std(cols.wood || '#8a6a4a', 0.6), 0, 1.7, 0, w, 0.09, 0.025, 0.01);
    for (let i = 0; i < 4; i++) box(g, dark, -w * 0.375 + i * w * 0.25, 1.68, 0.04, 0.02, 0.02, 0.06, 0);
    box(g, std('#4a5a6a', 0.9), -w * 0.12, 1.38, 0.06, 0.34, 0.55, 0.08, 0.03);
  } else if (type === 'tvw') {
    // wall-mounted flat TV, centre at 1.15 m, slim bracket
    box(g, std('#15171b', 0.3, 0.2), 0, 1.15, 0, w, 0.68, 0.045, 0.01);
    box(g, std('#0a0c10', 0.08, 0.1), 0, 1.15, 0.024, w * 0.96, 0.62, 0.005, 0);
    box(g, dark, 0, 1.15, -0.03, 0.3, 0.2, 0.02, 0);
  } else if (type === 'wshelf') {
    // wall shelf: two boards on brackets, mounted 1.35 / 1.7 m, a few boxes and books
    const wd = std(cols.wood || '#c4a07a', 0.6);
    for (const y of [1.35, 1.7]) { box(g, wd, 0, y, 0, w, 0.025, d, 0.005); box(g, dark, -w * 0.4, y - 0.06, -d * 0.3, 0.02, 0.1, d * 0.4, 0); box(g, dark, w * 0.4, y - 0.06, -d * 0.3, 0.02, 0.1, d * 0.4, 0); }
    box(g, std('#d8cfc0', 0.8), -w * 0.22, 1.43, 0, 0.22, 0.14, d * 0.7, 0.01);
    box(g, std('#6a7a88', 0.7), w * 0.18, 1.79, 0, 0.18, 0.16, d * 0.6, 0.005);
  } else if (type === 'washer') {
    ao(g, w + 0.04, d + 0.04);
    box(g, std('#f2f2f0', 0.4), 0, h / 2, 0, w, h, d, 0.03);
    box(g, std('#3a3e44', 0.3, 0.3), 0, h * 0.5, d / 2 + 0.01, 0.36, 0.36, 0.02, 0.08);
  } else if (type === 'bath') {
    ao(g, w + 0.08, d + 0.08);
    box(g, white, 0, 0.3, 0, w, 0.58, d, 0.05);
    box(g, std('#9ec0d4', 0.3), 0, 0.55, 0, w - 0.18, 0.08, d - 0.18, 0.02);
    box(g, std('#dfeaf0', 0.5), 0, 0.62, 0, w - 0.08, 0.04, d - 0.08, 0.02);
    box(g, metal, w / 2 - 0.12, 0.72, -d / 2 + 0.1, 0.04, 0.32, 0.04, 0);
  } else if (type === 'shower') {
    ao(g, w, d);
    box(g, white, 0, 0.12, 0, w, 0.24, d, 0.03);
    box(g, std('#c5d8e4', 0.2), 0, 0.22, 0, w - 0.14, 0.04, d - 0.14, 0.01);
    // prem8 h10: clear glass screens (8 mm) on a slim anthracite profile instead of opaque panels
    const sg = cache.get('showerGlass') || new THREE.MeshPhysicalMaterial({ color: 0xe4f0f4, transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0, envMapIntensity: 1.6, depthWrite: false });
    cache.set('showerGlass', sg); const pf = std('#2f3235', 0.4, 0.3);
    box(g, sg, -w / 2 + 0.02, 1.0, 0, 0.008, 2.0, d - 0.05, 0).castShadow = false;
    box(g, sg, 0, 1.0, -d / 2 + 0.02, w - 0.05, 2.0, 0.008, 0).castShadow = false;
    box(g, pf, -w / 2 + 0.02, 2.0, 0, 0.02, 0.02, d - 0.05, 0);
    box(g, pf, 0, 2.0, -d / 2 + 0.02, w - 0.05, 0.02, 0.02, 0);
    box(g, pf, -w / 2 + 0.02, 1.0, d / 2 - 0.035, 0.02, 2.0, 0.02, 0);
    cyl(g, metal, w / 2 - 0.1, 1.65, -d / 2 + 0.1, 0.035, 0.035, 0.18, 6);
  } else if (type === 'sink') {
    ao(g, w, d);
    box(g, white, 0, 0.4, 0, w, 0.8, d, 0.04);
    box(g, std('#d0e0ea', 0.25), 0, 0.82, 0, w - 0.1, 0.05, d - 0.1, 0.02);
    cyl(g, metal, 0, 0.95, -d / 2 + 0.1, 0.022, 0.022, 0.18, 6);
  } else if (type === 'wc') {
    ao(g, w + 0.05, d + 0.05);
    box(g, white, 0, 0.2, 0.05, w, 0.4, d * 0.7, 0.05);
    box(g, white, 0, 0.55, -d / 2 + 0.08, w * 0.9, 0.7, 0.14, 0.03);
    cyl(g, white, 0, 0.42, 0.05, w * 0.35, w * 0.35, 0.08, 10);
  } else if (type === 'shelf') {
    ao(g, w, d);
    for (let i = 0; i < 4; i++) box(g, wood, 0, 0.35 + i * 0.4, 0, w, 0.035, d, 0.01);
    box(g, wood, -w / 2 + 0.025, 0.9, 0, 0.04, 1.7, d, 0.01);
    box(g, wood, w / 2 - 0.025, 0.9, 0, 0.04, 1.7, d, 0.01);
    // books
    const bcols = ['#6a4a3a', '#3a5a6a', '#8a5a3a', '#4a4a5a', '#7a3a3a'];
    for (let i = 0; i < 5; i++) {
      box(g, std(bcols[i], 0.85), -w * 0.3 + i * 0.14, 0.55, 0, 0.1, 0.28, d * 0.7, 0.01);
    }
  } else if (type === 'plant') {
    ao(g, 0.35, 0.35);
    cyl(g, std('#7a5a3a', 0.8), 0, 0.18, 0, 0.14, 0.18, 0.36, 8);
    const leaf = std('#3f5c32', 1);
    const leaf2 = std('#5a7a42', 1);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), i % 2 ? leaf : leaf2);
      s.position.set(Math.cos(ang) * 0.1, 0.5 + (i % 2) * 0.12, Math.sin(ang) * 0.1);
      s.castShadow = true;
      g.add(s);
    }
  } else if (type === 'rug' || type === 'runner') {
    const base = cols.fab || cols.rug || (type === 'runner' ? '#6a3a28' : '#a03828');
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), std(base, 1));
    m.position.set(0, 0.045, 0); m.receiveShadow = true; m.renderOrder=2; g.add(m);
    // patterned border + centre medallion readable from dollhouse
    const border = std(cols.border || '#d8c4a8', 1);
    box(g, border, 0, 0.052, 0, w * 0.92, 0.008, d * 0.92, 0);
    box(g, std(base, 1), 0, 0.056, 0, w * 0.78, 0.006, d * 0.78, 0);
    const accent = std(cols.accent || '#c4a070', 1);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      if (!i && !j) continue;
      box(g, accent, i * w * 0.22, 0.06, j * d * 0.22, w * 0.12, 0.005, d * 0.12, 0);
    }
    box(g, std('#e8dcc8', 1), 0, 0.062, 0, w * 0.16, 0.005, d * 0.16, 0);
  } else if (type === 'chair') {
    ao(g, w * 0.9, d * 0.9);
    box(g, wood, 0, 0.42, 0, w, 0.04, d, 0.015);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
      box(g, wood, a * w * 0.35, 0.2, b * d * 0.35, 0.035, 0.4, 0.035, 0.008)
    );
    box(g, fab, 0, 0.48, 0, w - 0.04, 0.07, d - 0.04, 0.03);
    box(g, fab, 0, 0.7, -d / 2 + 0.035, w - 0.02, 0.42, 0.05, 0.025);
  } else if (type === 'lamp') {
    ao(g, 0.3, 0.3);
    cyl(g, dark, 0, 0.55, 0, 0.025, 0.04, 1.1, 6);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), std('#f5e6c8', 0.4));
    cap.material.emissive = new THREE.Color('#aa8844');
    cap.material.emissiveIntensity = 0.35;
    cap.position.set(0, 1.15, 0);
    g.add(cap);
  } else if (type === 'art') {
    box(g, wood, 0, 1.35, 0, w, h || 0.7, 0.03, 0.01);
    const am = std('#ddd', 0.9);
    am.map = artMap();
    am.map.colorSpace = THREE.SRGBColorSpace;
    box(g, am, 0, 1.35, 0.02, w - 0.08, (h || 0.7) - 0.08, 0.015, 0);
  } else if (type === 'curtain') {
    const cloth = std(cols.curtain || cols.fab || '#b8a890', 0.95);
    box(g, wood, 0, 2.15, 0, w + 0.08, 0.035, 0.035, 0.01);
    box(g, cloth, -w * 0.28, 1.15, 0, w * 0.36, 1.9, 0.04, 0.02);
    box(g, cloth, w * 0.28, 1.15, 0, w * 0.36, 1.9, 0.04, 0.02);
  } else if (type === 'shoe' || type === 'bench') {
    ao(g, w + 0.05, d + 0.05);
    box(g, wood, 0, 0.22, 0, w, 0.08, d, 0.02);
    box(g, wood, 0, 0.4, 0, w, 0.06, d * 0.9, 0.02);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
      box(g, wood, a * (w / 2 - 0.08), 0.2, b * (d / 2 - 0.06), 0.05, 0.4, 0.05, 0.01)
    );
    if (type === 'shoe') {
      box(g, wood, 0, 0.55, 0, w - 0.04, 0.03, d - 0.04, 0.01);
    }
  } else if (type === 'nstand') {
    ao(g, w, d);
    box(g, wood, 0, 0.28, 0, w, 0.56, d, 0.03);
    box(g, wood, 0, 0.58, 0, w + 0.02, 0.04, d + 0.02, 0.01);
    box(g, metal, 0, 0.4, d / 2 + 0.01, 0.08, 0.02, 0.015, 0);
  } else if (type === 'dresser') {
    ao(g, w + 0.04, d + 0.04);
    box(g, wood, 0, 0.45, 0, w, 0.9, d, 0.03);
    for (let i = 0; i < 3; i++) {
      box(g, std('#f0ebe4', 0.75), 0, 0.22 + i * 0.26, d / 2 - 0.01, w - 0.1, 0.2, 0.02, 0);
      box(g, metal, 0, 0.22 + i * 0.26, d / 2 + 0.01, 0.12, 0.015, 0.015, 0);
    }
  } else if (type === 'sideb') {
    ao(g, w + 0.04, d + 0.04);
    box(g, wood, 0, 0.4, 0, w, 0.8, d, 0.03);
    box(g, wood, 0, 0.82, 0, w + 0.04, 0.04, d + 0.04, 0.01);
    box(g, std('#efe8de', 0.7), -w * 0.22, 0.4, d / 2 - 0.01, w * 0.38, 0.55, 0.02, 0);
    box(g, std('#efe8de', 0.7), w * 0.22, 0.4, d / 2 - 0.01, w * 0.38, 0.55, 0.02, 0);
  } else if (type === 'side') {
    ao(g, w, d);
    box(g, wood, 0, 0.45, 0, w, 0.04, d, 0.015);
    cyl(g, wood, 0, 0.22, 0, 0.03, 0.04, 0.44, 6);
  } else if (type === 'stool') {
    ao(g, w, d);
    box(g, fab, 0, 0.72, 0, w, 0.06, d, 0.03);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
      box(g, wood, a * w * 0.32, 0.36, b * d * 0.32, 0.03, 0.72, 0.03, 0.008)
    );
  } else if (type === 'island') {
    ao(g, w + 0.08, d + 0.08);
    box(g, std('#efe8de', 0.75), 0, 0.42, 0, w, 0.84, d, 0.02);
    box(g, std('#2a2c2e', 0.35, 0.25), 0, 0.92, 0, w + 0.14, 0.08, d + 0.14, 0.01);
    // waterfall end accent
    box(g, std('#2a2c2e', 0.4, 0.2), w / 2 - 0.02, 0.46, 0, 0.04, 0.92, d + 0.1, 0);
  } else if (type === 'pendant') {
    cyl(g, metal, 0, 2.35, 0, 0.015, 0.015, 0.5, 6);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.22, 12, 1, true), std(cols.fab || '#e8dcc8', 0.7));
    shade.position.set(0, 2.05, 0); shade.castShadow = true; g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std('#f5e6c8', 0.3));
    bulb.material.emissive = new THREE.Color('#cc9944'); bulb.material.emissiveIntensity = 0.5;
    bulb.position.set(0, 2.0, 0); g.add(bulb);
  } else if (type === 'mirror') {
    box(g, wood, 0, 1.4, 0, w, h || 0.9, 0.04, 0.015);
    box(g, std('#c5d4e0', 0.15, 0.6), 0, 1.4, 0.02, w - 0.08, (h || 0.9) - 0.08, 0.02, 0);
  } else if (type === 'towel') {
    box(g, metal, 0, 1.0, 0, 0.03, 0.7, 0.03, 0);
    box(g, metal, 0, 1.15, 0.12, w, 0.025, 0.025, 0);
    box(g, metal, 0, 0.85, 0.12, w, 0.025, 0.025, 0);
    box(g, std(cols.fab || '#d8c8b0', 0.95), 0, 1.0, 0.16, w * 0.85, 0.45, 0.04, 0.02);
  } else if (type === 'coat') {
    // coat rack post + hooks + hanging coats (colour blocks from above)
    cyl(g, wood, 0, 0.9, 0, 0.035, 0.05, 1.8, 6);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      box(g, metal, Math.cos(ang) * 0.12, 1.55, Math.sin(ang) * 0.12, 0.12, 0.02, 0.02, 0);
    }
    const coats = ['#3a4a5a', '#6a3a3a', '#4a5a3a'];
    coats.forEach((c, i) => {
      const ang = (i / 3) * Math.PI * 2 + 0.3;
      box(g, std(c, 0.9), Math.cos(ang) * 0.18, 1.15, Math.sin(ang) * 0.18, 0.22, 0.7, 0.08, 0.03);
    });
  } else if (type === 'toy') {
    ao(g, w, d);
    box(g, std('#c4783a', 0.8), 0, 0.22, 0, w, 0.44, d, 0.04);
    box(g, wood, 0, 0.46, 0, w + 0.04, 0.05, d + 0.04, 0.02);
    // toy blocks peeking
    box(g, std('#3a6a8a', 0.9), -0.08, 0.55, 0.05, 0.12, 0.12, 0.12, 0.02);
    box(g, std('#8a3a3a', 0.9), 0.1, 0.52, -0.05, 0.1, 0.1, 0.1, 0.02);
  } else if (type === 'otable') {
    ao(g, w * 0.95, d * 0.95);
    box(g, wood, 0, 0.72, 0, w, 0.05, d, 0.02);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
      box(g, wood, (a * w) / 2 - a * 0.1, 0.35, (b * d) / 2 - b * 0.08, 0.05, 0.7, 0.05, 0.01)
    );
  } else if (type === 'lounge') {
    ao(g, w + 0.08, d + 0.08);
    const out = std(cols.fab || '#5a6a4a', 0.9);
    box(g, wood, 0, 0.18, 0, w, 0.08, d, 0.02);
    box(g, out, 0, 0.32, 0, w - 0.08, 0.2, d - 0.08, 0.05);
    box(g, out, 0, 0.5, -d / 2 + 0.08, w - 0.06, 0.35, 0.1, 0.04);
  } else {
    ao(g, w, d);
    box(g, fab, 0, h / 2, 0, w, h, d, 0.03);
  }
  return g;
}

export function makeFurn(type, F, cols = {}) {
  return proc(type, F, cols);
}

export function makeTree(s = 1) {
  const g = new THREE.Group();
  const trunk = std('#5c4030', 1);
  const a = std('#3f5c32', 1);
  const b = std('#5a7a42', 1);
  cyl(g, trunk, 0, 0.7 * s, 0, 0.1 * s, 0.16 * s, 1.4 * s, 6);
  [[0, 1.6 * s, 0.85 * s, a], [0.15 * s, 2.05 * s, 0.65 * s, b], [-0.12 * s, 2.35 * s, 0.45 * s, a]].forEach(([x, y, r, m]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), m);
    mesh.position.set(x, y, 0);
    mesh.scale.set(1.1, 0.85, 1.1);
    mesh.castShadow = true;
    g.add(mesh);
  });
  return g;
}

export function makeShrub(s = 0.5) {
  const g = new THREE.Group();
  const a = std('#4a6340', 1);
  const b = std('#5f7a48', 1);
  [[0, 0.65, 1], [0.2, 0.8, 0.7], [-0.15, 0.75, 0.65]].forEach(([x, y, k], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s * k, 6, 4), i ? b : a);
    m.position.set(x * s, y * s, 0);
    m.castShadow = false;
    g.add(m);
  });
  return g;
}

export function makeCar(color = '#4a6a80') {
  const g = new THREE.Group();
  const body = std(color, 0.45, 0.25);
  const dark = std('#1a1a1a', 0.8);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9eb8c8, transparent: true, opacity: 0.45, roughness: 0.15, metalness: 0.1 });
  box(g, body, 0, 0.45, 0, 1.85, 0.55, 4.2, 0.06);
  box(g, body, 0, 0.9, -0.15, 1.7, 0.5, 2.2, 0.05);
  box(g, glass, 0, 0.95, 0.55, 1.55, 0.35, 0.08, 0);
  box(g, glass, 0, 0.95, -0.95, 1.55, 0.35, 0.08, 0);
  [[-0.75, -1.25], [0.75, -1.25], [-0.75, 1.3], [0.75, 1.3]].forEach(([x, z]) => {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.28, 12), dark);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(x, 0.32, z);
    wh.castShadow = true;
    g.add(wh);
  });
  return g;
}

export function makeRug(w, d, c) {
  return proc('rug', { w, d, h: 0.02, c }, { rug: c });
}
