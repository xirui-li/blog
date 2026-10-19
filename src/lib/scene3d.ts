// Side-panel 3D scene: white, procedurally built architecture models on a
// plinth, seen through an isometric orthographic camera. Scroll rotates the
// model; each post section crossfades to the next model. Desktop only — the
// module is loaded on demand by SideScene.astro.
import * as THREE from 'three';

type Builder = (g: THREE.Group, t: Tools) => void;

interface Tools {
  box(w: number, h: number, d: number, x?: number, y?: number, z?: number): THREE.Mesh;
  cyl(rTop: number, rBottom: number, h: number, x?: number, y?: number, z?: number, seg?: number): THREE.Mesh;
  sphere(r: number, x?: number, y?: number, z?: number, half?: boolean): THREE.Mesh;
  /** Square pyramid roof (frustum when `top` > 0), edges aligned to the axes. */
  roof(bottom: number, top: number, h: number, y: number): THREE.Mesh;
  /** Triangular prism (gable roof) running along x. */
  gable(len: number, w: number, h: number, x: number, y: number, z: number): THREE.Mesh;
  ring(n: number, r: number, each: (x: number, z: number, a: number) => void, offset?: number): void;
  /** Tools that add to a child group (for parts that move independently). */
  child(group: THREE.Group): Tools;
}

function tools(g: THREE.Group, material: THREE.Material): Tools {
  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  return {
    // y is the bottom of the shape, so stacking is simple arithmetic.
    box: (w, h, d, x = 0, y = 0, z = 0) => add(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z),
    cyl: (rt, rb, h, x = 0, y = 0, z = 0, seg = 32) => add(new THREE.CylinderGeometry(rt, rb, h, seg), x, y + h / 2, z),
    sphere: (r, x = 0, y = 0, z = 0, half = false) =>
      add(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI), x, y, z),
    roof: (bottom, top, h, y) => {
      const m = add(new THREE.CylinderGeometry(top * Math.SQRT1_2, bottom * Math.SQRT1_2, h, 4), 0, y + h / 2, 0);
      m.rotation.y = Math.PI / 4;
      return m;
    },
    gable: (len, w, h, x, y, z) => {
      const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
      geo.translate(0, 0, -len / 2);
      const m = add(geo, x, y, z);
      m.rotation.y = Math.PI / 2;
      return m;
    },
    ring: (n, r, each, offset = 0) => {
      for (let i = 0; i < n; i++) {
        const a = offset + (i / n) * Math.PI * 2;
        each(Math.cos(a) * r, Math.sin(a) * r, a);
      }
    },
    child: (group) => {
      g.add(group);
      return tools(group, material);
    },
  };
}

// Every model stands on the same two-step plinth; y = 0.5 is its top.
const plinth: Builder = (_g, t) => {
  t.box(7, 0.25, 7);
  t.box(6.4, 0.25, 6.4, 0, 0.25);
};

const MODELS: Record<string, Builder> = {
  pagoda(g, t) {
    let y = 0.5;
    t.box(4.2, 0.5, 4.2, 0, y);
    y += 0.5;
    const tiers = [3, 2.6, 2.2, 1.85, 1.5];
    for (const s of tiers) {
      t.box(s, 0.95, s, 0, y);
      y += 0.95;
      t.roof(s + 1.3, s * 0.55, 0.45, y);
      y += 0.4;
    }
    t.cyl(0.08, 0.08, 1.4, 0, y);
    [0.22, 0.18, 0.14].forEach((r, i) => t.sphere(r, 0, y + 0.35 + i * 0.35));
  },

  lighthouse(g, t) {
    // Keeper's house
    t.box(2.2, 1.1, 1.6, 1.4, 0.5, 1.2);
    t.gable(2.4, 1.8, 0.7, 1.4, 1.6, 1.2);
    // Tower with banding rings
    t.cyl(0.85, 1.35, 5.6, -0.5, 0.5, -0.4);
    for (let i = 1; i < 5; i++) t.cyl(1.38 - i * 0.1, 1.4 - i * 0.1, 0.12, -0.5, 0.5 + i * 1.12, -0.4);
    // Gallery with railing posts
    const top = 6.1;
    t.cyl(1.25, 1.1, 0.18, -0.5, top, -0.4);
    t.ring(16, 1.15, (x, z) => t.box(0.05, 0.4, 0.05, x - 0.5, top + 0.18, z - 0.4));
    t.cyl(1.17, 1.17, 0.04, -0.5, top + 0.56, -0.4);
    // Lantern room
    t.cyl(0.6, 0.6, 0.15, -0.5, top + 0.18, -0.4);
    t.ring(8, 0.58, (x, z) => t.box(0.06, 0.75, 0.06, x - 0.5, top + 0.33, z - 0.4));
    t.cyl(0.45, 0.45, 0.75, -0.5, top + 0.33, -0.4, 8);
    t.sphere(0.65, -0.5, top + 1.08, -0.4, true);
    t.cyl(0.03, 0.06, 0.5, -0.5, top + 1.65, -0.4);
  },

  temple(g, t) {
    // Stylobate steps
    t.box(5.6, 0.25, 4, 0, 0.5);
    t.box(5.2, 0.25, 3.6, 0, 0.75);
    const y = 1;
    const colsX = 6, colsZ = 4, w = 4.6, d = 3;
    for (let i = 0; i < colsX; i++)
      for (let j = 0; j < colsZ; j++) {
        if (i > 0 && i < colsX - 1 && j > 0 && j < colsZ - 1) continue;
        const x = -w / 2 + (i * w) / (colsX - 1);
        const z = -d / 2 + (j * d) / (colsZ - 1);
        t.box(0.5, 0.1, 0.5, x, y, z);
        t.cyl(0.17, 0.21, 2.6, x, y + 0.1, z, 16);
        t.box(0.48, 0.14, 0.48, x, y + 2.7, z);
      }
    // Cella, entablature, pediment
    t.box(3, 2.6, 1.6, 0, y, 0);
    t.box(5.3, 0.25, 3.7, 0, y + 2.84);
    t.box(5.2, 0.3, 3.6, 0, y + 3.09);
    t.gable(5.4, 3.8, 1.0, 0, y + 3.39, 0);
  },

  observatory(g, t) {
    // Drum building and dome with an open slit
    t.cyl(1.9, 1.9, 2.2, -0.3, 0.5, -0.3, 48);
    t.cyl(1.98, 1.98, 0.14, -0.3, 2.7, -0.3, 48);
    const dome = t.sphere(1.85, -0.3, 2.84, -0.3, true);
    dome.rotation.y = Math.PI / 4;
    // Shutter strip over the dome, facing the camera side.
    t.box(0.6, 1.9, 0.6, -0.3, 2.84, -0.3).rotation.y = Math.PI / 4;
    const shutter = t.box(0.62, 0.12, 2.0, -0.3, 4.62, -0.3);
    shutter.rotation.y = Math.PI / 4;
    // Annexes and a door
    t.box(1.8, 1.2, 1.4, 2.0, 0.5, 1.5);
    t.box(1.9, 0.12, 1.5, 2.0, 1.7, 1.5);
    t.box(1.2, 0.9, 1.6, 1.6, 0.5, -1.8);
    t.box(0.6, 1.0, 0.1, 0.9, 0.5, 1.45);
  },

  windmill(g, t) {
    // Octagonal tapered tower, gallery, cap
    t.cyl(1.0, 1.6, 4.6, 0, 0.5, 0, 8);
    t.cyl(1.55, 1.55, 0.1, 0, 2.2, 0, 8);
    t.ring(16, 1.5, (x, z) => t.box(0.04, 0.35, 0.04, x, 2.3, z));
    t.cyl(1.05, 1.05, 0.2, 0, 5.1, 0, 8);
    const cap = t.sphere(1.0, 0, 5.3, 0, true);
    cap.scale.set(1, 0.8, 1.15);
    t.box(0.5, 0.7, 0.1, 0, 0.5, 1.58).rotation.x = -0.12;
    // Sails on a hub; spun in the render loop via userData.
    const sails = new THREE.Group();
    sails.position.set(0, 5.6, 1.25);
    const st = t.child(sails);
    st.cyl(0.18, 0.18, 0.4, 0, -0.2, 0, 16).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      const at = st.child(arm);
      at.box(0.1, 3.1, 0.08, 0, 0.1, 0.05);
      at.box(0.7, 2.3, 0.03, 0.42, 0.8, 0.05);
      for (let k = 0; k < 6; k++) at.box(0.75, 0.04, 0.06, 0.42, 0.85 + k * 0.42, 0.08);
    }
    g.userData.spin = sails;
  },

  temple_of_heaven(g, t) {
    // Three round terraces with railing posts
    const terraces = [3.1, 2.65, 2.2];
    let y = 0.5;
    for (const r of terraces) {
      t.cyl(r, r, 0.3, 0, y, 0, 64);
      y += 0.3;
      t.ring(Math.round(r * 14), r - 0.08, (x, z) => t.box(0.05, 0.22, 0.05, x, y, z));
    }
    // Hall: three drums under three conical roofs
    const levels = [
      { r: 1.55, h: 1.0, roof: 2.0 },
      { r: 1.2, h: 0.75, roof: 1.6 },
      { r: 0.85, h: 0.6, roof: 1.2 },
    ];
    for (const l of levels) {
      t.cyl(l.r, l.r, l.h, 0, y, 0, 48);
      t.ring(16, l.r + 0.02, (x, z) => t.box(0.08, l.h, 0.08, x, y, z));
      y += l.h;
      t.cyl(l.roof * 0.35, l.roof, 0.55, 0, y, 0, 48);
      y += 0.55;
    }
    t.cyl(0.18, 0.28, 0.35, 0, y, 0, 24);
    t.sphere(0.24, 0, y + 0.55);
  },
};

export const MODEL_NAMES = Object.keys(MODELS);

export function mount(host: HTMLElement, opts: { seed: string; sections?: HTMLElement[] }) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'scene-canvas';
  host.appendChild(canvasWrap);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  canvasWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
  camera.position.set(10, 11, 10);
  camera.lookAt(0, 2.8, 0);

  // Tuned so up-facing surfaces land just below white (#eee) and stay
  // visible against the page, with sides in soft grays.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfcfca, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-6, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 9, bottom: -7, near: 1, far: 40 });
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(8, 4, 2);
  scene.add(fill);

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });

  const build = (name: string) => {
    const g = new THREE.Group();
    const t = tools(g, material);
    plinth(g, t);
    MODELS[name](g, t);
    return g;
  };

  // Deterministic starting model per page, then one model per section.
  const hash = [...opts.seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  // ?scene=<name> pins the first model (handy when tweaking models).
  const pinned = MODEL_NAMES.indexOf(new URLSearchParams(location.search).get('scene') ?? '');
  const base = pinned >= 0 ? pinned : hash % MODEL_NAMES.length;
  const nameFor = (section: number) => MODEL_NAMES[(base + section) % MODEL_NAMES.length];

  let section = 0;
  let model = build(nameFor(0));
  scene.add(model);

  const sections = opts.sections ?? [];
  const currentSection = () => {
    let i = 0;
    sections.forEach((s, k) => {
      if (s.getBoundingClientRect().top < innerHeight * 0.5) i = k + 1;
    });
    return i;
  };

  let swapTimer = 0;
  const swapTo = (next: number) => {
    section = next;
    clearTimeout(swapTimer);
    canvasWrap.classList.add('is-fading');
    swapTimer = window.setTimeout(
      () => {
        scene.remove(model);
        model.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        model = build(nameFor(section));
        scene.add(model);
        canvasWrap.classList.remove('is-fading');
      },
      reducedMotion ? 0 : 280,
    );
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvasWrap;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    // Fit the plinth's width; keep enough height for the tallest model.
    let halfW = 6.6;
    let halfH = halfW * (h / w);
    if (halfH < 6.4) {
      halfH = 6.4;
      halfW = halfH * (w / h);
    }
    Object.assign(camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvasWrap);
  resize();

  const clock = new THREE.Clock();
  let idle = 0;
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!reducedMotion) idle += dt * 0.12;
    model.rotation.y = 0.6 + idle + scrollY * 0.0022;
    const spin = model.userData.spin as THREE.Object3D | undefined;
    if (spin && !reducedMotion) spin.rotation.z -= dt * 0.6;
    const s = currentSection();
    if (s !== section) swapTo(s);
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(frame);
  host.classList.add('is-ready');

  return () => {
    renderer.setAnimationLoop(null);
    renderer.dispose();
    canvasWrap.remove();
  };
}
