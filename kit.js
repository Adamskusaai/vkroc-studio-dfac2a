// Low-poly house kit: Poly Haven glTF where available + procedural CC0 fallbacks.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();
let ready = null;

const GLB = {
  sofa: 'assets/cc0/furn/sofa/sofa_03_1k.gltf',
  table: 'assets/cc0/furn/table/wooden_table_02_1k.gltf',
  ctable: 'assets/cc0/furn/ctable/modern_coffee_table_01_1k.gltf',
  armch: 'assets/cc0/furn/armch/modern_arm_chair_01_1k.gltf',
};

function std(c, rough = 0.7, metal = 0) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: rough, metalness: metal });
}

function box(g, mat, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
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

async function loadOne(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((res, rej) => {
    loader.load(url, (gltf) => {
      gltf.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = o.receiveShadow = true;
          if (o.material) {
            const mats = [].concat(o.material);
            mats.forEach((m) => {
              if (m.map) {
                m.map.anisotropy = 4;
                m.map.colorSpace = THREE.SRGBColorSpace;
              }
            });
          }
        }
      });
      res(gltf.scene);
    }, undefined, rej);
  });
  cache.set(url, p);
  return p;
}

export async function loadKit() {
  if (ready) return ready;
  ready = Promise.all(
    Object.entries(GLB).map(async ([k, url]) => {
      try {
        const s = await loadOne(url);
        cache.set('tpl_' + k, s);
      } catch (e) {
        console.warn('kit load fail', k, e);
      }
    })
  );
  await ready;
  return ready;
}

function cloneTpl(key, targetW, targetD, targetH) {
  const tpl = cache.get('tpl_' + key);
  if (!tpl) return null;
  const g = new THREE.Group();
  const inst = tpl.clone(true);
  g.add(inst);
  // Reset transforms
  inst.position.set(0,0,0); inst.rotation.set(0,0,0); inst.scale.set(1,1,1);
  g.updateMatrixWorld(true);
  const box3 = new THREE.Box3().setFromObject(g);
  const size = new THREE.Vector3(); box3.getSize(size);
  if (size.x < 1e-3 || size.z < 1e-3) return null;
  const sx = targetW / size.x, sz = targetD / size.z;
  let s = Math.min(sx, sz);
  // Poly Haven sometimes in cm — clamp to sensible furniture scale
  if (s < 0.05) s *= 100;
  if (s > 8) s /= 100;
  s = Math.min(Math.max(s, 0.35), 2.8);
  const sy = targetH ? Math.min(Math.max(targetH / Math.max(size.y, 1e-3), 0.35), 2.8) : s;
  inst.scale.set(s, sy, s);
  g.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(g);
  const c = new THREE.Vector3(); b2.getCenter(c);
  inst.position.x -= c.x; inst.position.z -= c.z; inst.position.y -= b2.min.y;
  return g;
}

/** Procedural Kenney-style pieces (original CC0). */
function proc(type, F, cols) {
  const g = new THREE.Group();
  const wood = std(cols.wood || '#b08a63', 0.55);
  const fab = std(cols.fab || F.c || '#8e9aa6', 0.85);
  const white = std('#f4f1ec', 0.7);
  const dark = std('#2f3235', 0.5, 0.15);
  const metal = std('#c8ccd0', 0.35, 0.55);
  const { w, d, h } = F;

  if (type === 'bed' || type === 'bed1') {
    box(g, wood, 0, 0.12, 0, w, 0.24, d);
    box(g, std('#f0ebe3', 0.9), 0, 0.36, 0.02, w - 0.08, 0.14, d - 0.12);
    box(g, wood, 0, 0.45, -d / 2 + 0.04, w, 0.7, 0.08);
    const duvet = std(cols.bed || '#7a5535', 0.88);
    box(g, duvet, 0, 0.48, d * 0.06, w - 0.08, 0.12, d * 0.72);
    const pw = type === 'bed' ? w * 0.36 : w * 0.5;
    box(g, std('#efe6d8', 0.95), type === 'bed' ? -w * 0.22 : 0, 0.58, -d / 2 + 0.32, pw, 0.1, 0.35);
    if (type === 'bed') box(g, std('#efe6d8', 0.95), w * 0.22, 0.58, -d / 2 + 0.32, pw, 0.1, 0.35);
    // bedside
    {
      box(g, wood, -w / 2 - 0.28, 0.25, -d / 2 + 0.35, 0.4, 0.5, 0.4);
      if (type === 'bed') box(g, wood, w / 2 + 0.28, 0.25, -d / 2 + 0.35, 0.4, 0.5, 0.4);
      cyl(g, std('#f5e6c8', 0.4), -w / 2 - 0.28, 0.7, -d / 2 + 0.35, 0.06, 0.06, 0.25, 6);
    }
  } else if (type === 'sofa') {
    const linen = std(cols.fab || '#7a6854', 0.88);
    box(g, wood, 0, 0.05, 0, w, 0.08, d);
    box(g, linen, 0, 0.26, 0.02, w - 0.08, 0.26, d - 0.12);
    for (let i = 0; i < 3; i++) {
      const cw = (w - 0.16) / 3 - 0.04;
      box(g, linen, -w / 2 + 0.12 + (i + 0.5) * ((w - 0.16) / 3), 0.46, 0.04, cw, 0.1, d - 0.28);
    }
    box(g, linen, 0, 0.55, -d / 2 + 0.12, w - 0.04, 0.4, 0.16);
    box(g, linen, -w / 2 + 0.09, 0.45, 0.02, 0.14, 0.34, d - 0.16);
    box(g, linen, w / 2 - 0.09, 0.45, 0.02, 0.14, 0.34, d - 0.16);
  } else if (type === 'armch') {
    box(g, wood, 0, 0.06, 0, w, 0.1, d);
    box(g, fab, 0, 0.28, 0, w - 0.05, 0.28, d - 0.05);
    box(g, fab, 0, 0.5, 0, w - 0.12, 0.12, d - 0.16);
    box(g, fab, 0, 0.58, -d / 2 + 0.1, w, 0.4, 0.14);
    box(g, fab, -w / 2 + 0.07, 0.48, 0, 0.12, 0.34, d - 0.1);
    box(g, fab, w / 2 - 0.07, 0.48, 0, 0.12, 0.34, d - 0.1);
  } else if (type === 'table') {
    box(g, wood, 0, 0.72, 0, w, 0.06, d);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
      box(g, wood, (a * w) / 2 - a * 0.08, 0.36, (b * d) / 2 - b * 0.08, 0.08, 0.72, 0.08)
    );
  } else if (type === 'ctable') {
    box(g, wood, 0, 0.4, 0, w, 0.04, d);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(g, wood, a*(w/2-0.06), 0.2, b*(d/2-0.06), 0.05, 0.4, 0.05));
  } else if (type === 'desk') {
    box(g, wood, 0, 0.72, 0, w, 0.05, d);
    box(g, wood, -w / 2 + 0.08, 0.36, 0, 0.08, 0.72, d - 0.05);
    box(g, wood, w / 2 - 0.08, 0.36, 0, 0.08, 0.72, d - 0.05);
    box(g, wood, 0, 0.35, d / 2 - 0.08, w - 0.1, 0.5, 0.05);
  } else if (type === 'tv') {
    box(g, wood, 0, 0.25, 0, w, 0.5, d);
    box(g, dark, 0, 0.95, -d / 2 + 0.04, w * 0.85, 0.7, 0.05);
    box(g, std('#111', 0.3), 0, 0.95, -d / 2 + 0.02, w * 0.78, 0.62, 0.02);
  } else if (type === 'ward') {
    box(g, wood, 0, h / 2, 0, w, h, d);
    box(g, std('#f7f2ea', 0.75), 0, h / 2, d / 2 - 0.01, w - 0.08, h - 0.12, 0.02);
    box(g, wood, 0, h / 2, d / 2 + 0.005, 0.03, h - 0.15, 0.02);
    box(g, metal, -w * 0.18, h * 0.5, d / 2 + 0.02, 0.03, 0.18, 0.02);
    box(g, metal, w * 0.18, h * 0.5, d / 2 + 0.02, 0.03, 0.18, 0.02);
    box(g, wood, 0, h + 0.01, 0, w + 0.02, 0.04, d + 0.02);
  } else if (type === 'kitch') {
    // base cabinets + continuous oak worktop (reads from dollhouse)
    box(g, std('#f4f1ec', 0.75), 0, 0.42, 0, w, 0.84, d);
    box(g, wood, 0, 0.9, 0, w + 0.08, 0.07, d + 0.1);
    // upper cabinets
    box(g, std('#f7f4ee', 0.75), 0, 2.05, -d * 0.08, w * 0.95, 0.75, d * 0.65);
    box(g, wood, 0, 2.45, -d * 0.08, w * 0.97, 0.04, d * 0.68);
    // sink + stove on worktop
    box(g, metal, -w * 0.28, 0.94, 0, 0.48, 0.05, 0.36);
    box(g, dark, w * 0.28, 0.94, 0, 0.52, 0.04, 0.46);
    for (let i = 0; i < 4; i++)
      cyl(g, dark, w * 0.18 + (i % 2) * 0.2, 0.97, -0.1 + Math.floor(i / 2) * 0.2, 0.07, 0.07, 0.03, 8);
    // toe-kick contrast
    box(g, dark, 0, 0.05, 0, w - 0.04, 0.1, d - 0.04);
  } else if (type === 'fridge') {
    box(g, metal, 0, h / 2, 0, w, h, d);
    box(g, dark, w / 2 - 0.02, h * 0.55, d / 2 + 0.01, 0.03, 0.5, 0.02);
    box(g, std('#e8eef5', 0.3), 0, h * 0.7, d / 2 - 0.01, w - 0.08, h * 0.35, 0.02);
  } else if (type === 'bath') {
    box(g, white, 0, 0.28, 0, w, 0.55, d);
    box(g, std('#d8e8f0', 0.25), 0, 0.52, 0, w - 0.14, 0.06, d - 0.14);
    box(g, metal, w/2-0.12, 0.7, -d/2+0.1, 0.04, 0.35, 0.04);
  } else if (type === 'shower') {
    // tray / tub basin — readable from dollhouse
    box(g, white, 0, 0.12, 0, w, 0.24, d);
    box(g, std('#d5e8f0', 0.2), 0, 0.22, 0, w - 0.12, 0.04, d - 0.12);
    box(g, std('#cfe0ea', 0.2, 0.1), -w / 2 + 0.02, 1.0, 0, 0.04, 2.0, d);
    box(g, std('#cfe0ea', 0.2, 0.1), 0, 1.0, -d / 2 + 0.02, w, 2.0, 0.04);
    cyl(g, metal, w / 2 - 0.1, 1.7, -d / 2 + 0.1, 0.04, 0.04, 0.2, 6);
  } else if (type === 'sink') {
    box(g, white, 0, 0.4, 0, w, 0.8, d);
    box(g, std('#e8f0f5', 0.3), 0, 0.82, 0, w - 0.08, 0.06, d - 0.08);
    cyl(g, metal, 0, 0.95, -d / 2 + 0.1, 0.025, 0.025, 0.2, 6);
  } else if (type === 'wc') {
    box(g, white, 0, 0.2, 0.05, w, 0.4, d * 0.7);
    box(g, white, 0, 0.55, -d / 2 + 0.08, w * 0.9, 0.7, 0.14);
    cyl(g, white, 0, 0.42, 0.05, w * 0.35, w * 0.35, 0.08, 10);
  } else if (type === 'shelf') {
    for (let i = 0; i < 4; i++) box(g, wood, 0, 0.35 + i * 0.4, 0, w, 0.04, d);
    box(g, wood, -w / 2 + 0.03, 0.9, 0, 0.05, 1.7, d);
    box(g, wood, w / 2 - 0.03, 0.9, 0, 0.05, 1.7, d);
  } else if (type === 'plant') {
    cyl(g, std('#8a6a4a', 0.8), 0, 0.2, 0, 0.16, 0.2, 0.4, 8);
    const leaf = std('#4f6b3c', 1);
    const leaf2 = std('#6a8450', 1);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), i % 2 ? leaf : leaf2);
      s.position.set(Math.cos(ang) * 0.12, 0.55 + (i % 2) * 0.15, Math.sin(ang) * 0.12);
      s.castShadow = true;
      g.add(s);
    }
  } else if (type === 'rug') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), std(cols.fab || cols.rug || '#7a4a28', 1));
    m.position.set(0, 0.03, 0);
    m.receiveShadow = true;
    g.add(m);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(w*0.92, 0.01, d*0.92), std('#b8885c', 1));
    m2.position.set(0, 0.04, 0); g.add(m2);
  } else if (type === 'chair') {
    box(g, wood, 0, 0.42, 0, w, 0.06, d);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(g, wood, a*w*0.35, 0.21, b*d*0.35, 0.05, 0.42, 0.05));
    box(g, fab, 0, 0.5, 0, w-0.04, 0.08, d-0.04);
    box(g, fab, 0, 0.72, -d/2+0.04, w-0.02, 0.45, 0.06);
  } else if (type === 'lamp') {
    cyl(g, dark, 0, 0.55, 0, 0.03, 0.05, 1.1, 6);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), std('#f5e6c8', 0.4));
    cap.material.emissive = new THREE.Color('#665533');
    cap.material.emissiveIntensity = 0.55;
    cap.position.set(0, 1.15, 0);
    g.add(cap);
  } else if (type === 'art') {
    box(g, wood, 0, 1.35, 0, w, h || 0.7, 0.03);
    box(g, std(cols.fab || '#c4b8a4', 0.9), 0, 1.35, 0.02, w - 0.08, (h || 0.7) - 0.08, 0.02);
  } else if (type === 'curtain') {
    const cloth = std(cols.fab || '#e8e2d6', 0.95);
    box(g, wood, 0, 2.15, 0, w + 0.08, 0.04, 0.04);
    box(g, cloth, -w * 0.28, 1.15, 0, w * 0.38, 1.9, 0.04);
    box(g, cloth, w * 0.28, 1.15, 0, w * 0.38, 1.9, 0.04);
  } else if (type === 'shoe') {
    box(g, wood, 0, 0.35, 0, w, 0.7, d);
    box(g, wood, 0, 0.12, 0, w - 0.04, 0.03, d - 0.04);
    box(g, wood, 0, 0.35, 0, w - 0.04, 0.03, d - 0.04);
    box(g, wood, 0, 0.55, 0, w - 0.04, 0.03, d - 0.04);
  } else {
    box(g, fab, 0, h / 2, 0, w, h, d);
  }
  return g;
}

export function makeFurn(type, F, cols = {}) {
  // Always procedural modern-Scandi kit for consistent marketing style (1:1 FUR sizes).
  // Poly Haven glTF kept on disk/CREDITS for future opt-in, but mixed photoreal+blocky reads poorly.
  return proc(type, F, cols);
}

export function makeTree(s = 1) {
  const g = new THREE.Group();
  const trunk = std('#5c4030', 1);
  const a = std('#3f5c32', 1);
  const b = std('#5a7a42', 1);
  cyl(g, trunk, 0, 0.7 * s, 0, 0.1 * s, 0.16 * s, 1.4 * s, 6);
  const layers = [
    [0, 1.6 * s, 0.85 * s, a],
    [0.15 * s, 2.05 * s, 0.65 * s, b],
    [-0.12 * s, 2.35 * s, 0.45 * s, a],
  ];
  layers.forEach(([x, y, r, m]) => {
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

/** Kenney-style low-poly car (original CC0), footprint ~4.2 x 1.9 m */
export function makeCar(color = '#4a6a80') {
  const g = new THREE.Group();
  const body = std(color, 0.45, 0.25);
  const dark = std('#1a1a1a', 0.8);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9eb8c8, roughness: true, opacity: 0.45, roughness: 0.15, metalness: 0.1 });
  box(g, body, 0, 0.45, 0, 1.85, 0.55, 4.2);
  box(g, body, 0, 0.9, -0.15, 1.7, 0.5, 2.2);
  box(g, glass, 0, 0.95, 0.55, 1.55, 0.35, 0.08);
  box(g, glass, 0, 0.95, -0.95, 1.55, 0.35, 0.08);
  [[-0.75, -1.25], [0.75, -1.25], [-0.75, 1.3], [0.75, 1.3]].forEach(([x, z]) => {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.28, 12), dark);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(x, 0.32, z);
    wh.castShadow = true;
    g.add(wh);
  });
  box(g, std('#f5f0c8', 0.4), 0.55, 0.55, -2.05, 0.2, 0.12, 0.08);
  box(g, std('#f5f0c8', 0.4), -0.55, 0.55, -2.05, 0.2, 0.12, 0.08);
  return g;
}

export function makeRug(w, d, c) {
  return proc('rug', { w, d, h: 0.02, c }, { rug: c });
}
