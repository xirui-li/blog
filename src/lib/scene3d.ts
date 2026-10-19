// Side-panel 3D scene: white, procedurally built models on a plinth, seen
// through an isometric orthographic camera. Scroll rotates the model; each
// post section crossfades to the next model unless the post pins one with
// `scene:` in its frontmatter. Desktop only — the module is loaded on demand
// by SideScene.astro.
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
  /** The same tools with the darker accent material (rubber pads, lenses, marks). */
  readonly alt: Tools;
}

interface Materials {
  base: THREE.Material;
  alt: THREE.Material;
}

function tools(g: THREE.Group, mats: Materials, material = mats.base): Tools {
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
      return tools(group, mats, material);
    },
    get alt() {
      return tools(g, mats, mats.alt);
    },
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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
    // Sails on a hub, spun by the per-frame update hook.
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
    g.userData.update = (dt: number) => (sails.rotation.z -= dt * 0.6);
  },

  robot_arm(g, t) {
    // An articulated arm (yaw base, shoulder, elbow, wrist) with a parallel
    // gripper moves a cube between two marked spots. Joint angles come from
    // two-link inverse kinematics; the gripper always points straight down.
    g.userData.scale = 0.78;
    const BASE = { x: 0, z: -1.5 };
    const SHOULDER_Y = 2.0; // world height of the shoulder axis
    const L1 = 2.0; // upper arm
    const L2 = 1.8; // forearm
    const D = 1.4; // wrist axis to fingertips
    const SPOTS = [{ x: -1.4, z: 0.6 }, { x: 1.4, z: 0.6 }];
    const HOVER = 2.2; // fingertip height while travelling
    const GRASP = 0.62;
    const OPEN = 0.62; // finger inner-face offset from the gripper center
    const CLOSED = 0.4; // cube half-width
    const LOOP = 8;

    // Joint housing: a cylinder along z with a darker end cap.
    const joint = (tt: Tools, r: number, len: number, x = 0, y = 0) => {
      const c = tt.cyl(r, r, len, 0, 0, 0, 32);
      c.rotation.x = Math.PI / 2;
      c.position.set(x, y, 0);
      const cap = tt.alt.cyl(r * 0.55, r * 0.55, 0.03, 0, 0, 0, 24);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(x, y, len / 2 + 0.01);
    };

    for (const { x, z } of SPOTS) {
      t.alt.box(1.1, 0.02, 0.05, x, 0.5, z + 0.53);
      t.alt.box(1.1, 0.02, 0.05, x, 0.5, z - 0.53);
      t.alt.box(0.05, 0.02, 1.1, x + 0.53, 0.5, z);
      t.alt.box(0.05, 0.02, 1.1, x - 0.53, 0.5, z);
    }

    const cube = new THREE.Group();
    const ct = t.child(cube);
    ct.box(0.8, 0.8, 0.8, 0, -0.4, 0);
    ct.alt.box(0.36, 0.36, 0.02, 0, -0.18, 0.41);
    ct.alt.box(0.02, 0.36, 0.36, 0.41, -0.18, 0);

    // Base flange (fixed) and turret (yaw).
    t.cyl(0.8, 0.85, 0.2, BASE.x, 0.5, BASE.z, 40);
    const yaw = new THREE.Group();
    yaw.position.set(BASE.x, 0.7, BASE.z);
    const yt = t.child(yaw);
    yt.alt.cyl(0.66, 0.66, 0.05, 0, 0, 0, 40);
    yt.cyl(0.6, 0.62, 0.45, 0, 0.05, 0, 40);
    yt.cyl(0.42, 0.48, SHOULDER_Y - 0.7 - 0.5, 0, 0.5, 0, 32);

    const shoulder = new THREE.Group();
    shoulder.position.y = SHOULDER_Y - 0.7;
    const st = yt.child(shoulder);
    joint(st, 0.46, 0.95);
    st.box(L1, 0.5, 0.55, L1 / 2, -0.25, 0);

    const elbow = new THREE.Group();
    elbow.position.x = L1;
    const et = st.child(elbow);
    joint(et, 0.38, 0.78);
    et.box(L2, 0.42, 0.46, L2 / 2, -0.21, 0);

    const wrist = new THREE.Group();
    wrist.position.x = L2;
    const wt = et.child(wrist);
    joint(wt, 0.3, 0.62);
    // Gripper, built pointing along +x; fingers open along z.
    wt.box(0.35, 0.36, 0.4, 0.17, -0.18, 0);
    const flange = wt.alt.cyl(0.3, 0.3, 0.1, 0, 0, 0, 24);
    flange.rotation.z = Math.PI / 2;
    flange.position.set(0.4, 0, 0);
    wt.box(0.38, 0.42, 1.05, 0.64, -0.21, 0);
    const fingers = [1, -1].map((side) => {
      const f = new THREE.Group();
      const ft = wt.child(f);
      ft.box(0.55, 0.3, 0.14, 1.1, -0.15, 0);
      ft.alt.box(0.4, 0.24, 0.04, 1.15, -0.12, -side * 0.09);
      return { f, side };
    });

    // Fingertip target -> joint angles.
    const reach = (x: number, y: number, z: number) => {
      const dx = x - BASE.x;
      const dz = z - BASE.z;
      const r = Math.hypot(dx, dz);
      const h = y + D - SHOULDER_Y;
      const c2 = Math.max(-1, Math.min(1, (r * r + h * h - L1 * L1 - L2 * L2) / (2 * L1 * L2)));
      const q2 = -Math.acos(c2); // elbow up
      const q1 = Math.atan2(h, r) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
      yaw.rotation.y = Math.atan2(-dz, dx);
      shoulder.rotation.z = q1;
      elbow.rotation.z = q2;
      wrist.rotation.z = -Math.PI / 2 - q1 - q2;
      return yaw.rotation.y;
    };

    // Spots in polar coordinates around the base, so traversals follow an arc.
    const polar = SPOTS.map(({ x, z }) => ({ a: Math.atan2(z - BASE.z, x - BASE.x), r: Math.hypot(x - BASE.x, z - BASE.z) }));
    cube.rotation.y = Math.atan2(-(SPOTS[0].z - BASE.z), SPOTS[0].x - BASE.x);

    const pose = (time: number) => {
      const p = time % LOOP;
      const k = Math.floor(time / LOOP);
      const [from, to] = [k % 2, (k + 1) % 2];
      const lift = 1 - smooth(0, 1.2, p) + smooth(1.9, 3.1, p) - smooth(4.9, 6.1, p) + smooth(6.8, 8, p);
      const y = GRASP + (HOVER - GRASP) * lift;
      const m = smooth(3.1, 4.9, p);
      const a = polar[from].a + (polar[to].a - polar[from].a) * m;
      const r = polar[from].r + (polar[to].r - polar[from].r) * m;
      const x = BASE.x + Math.cos(a) * r;
      const z = BASE.z + Math.sin(a) * r;
      const heading = reach(x, y, z);
      const inner = OPEN + (CLOSED - OPEN) * (smooth(1.2, 1.9, p) - smooth(6.1, 6.8, p));
      for (const { f, side } of fingers) f.position.z = side * (inner + 0.07);
      if (p >= 1.9 && p < 6.1) {
        cube.position.set(x, y + 0.28, z);
        cube.rotation.y = heading;
      } else {
        const spot = SPOTS[p < 1.9 ? from : to];
        cube.position.set(spot.x, 0.9, spot.z);
      }
    };

    let time = 0;
    pose(time);
    g.userData.update = (dt: number) => pose((time += dt));
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

export function mount(host: HTMLElement, opts: { seed: string; model?: string; sections?: HTMLElement[] }) {
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

  const materials: Materials = {
    base: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 }),
    alt: new THREE.MeshStandardMaterial({ color: 0xa9aaa6, roughness: 0.8, metalness: 0 }),
  };

  const build = (name: string) => {
    const g = new THREE.Group();
    const t = tools(g, materials);
    plinth(g, t);
    MODELS[name](g, t);
    g.scale.setScalar((g.userData.scale as number | undefined) ?? 1);
    return g;
  };

  // A post's `scene:` keeps one model for the whole page. Otherwise start
  // from a deterministic model per page and change it per section.
  // ?scene=<name> sets the first model (handy when tweaking models).
  const hash = [...opts.seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const fixed = MODEL_NAMES.indexOf(opts.model ?? '');
  const pinned = MODEL_NAMES.indexOf(new URLSearchParams(location.search).get('scene') ?? '');
  const base = pinned >= 0 ? pinned : fixed >= 0 ? fixed : hash % MODEL_NAMES.length;
  const nameFor = (section: number) => MODEL_NAMES[(base + section) % MODEL_NAMES.length];

  let section = 0;
  let model = build(nameFor(0));
  scene.add(model);

  const sections = fixed >= 0 ? [] : (opts.sections ?? []);
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
    if (!reducedMotion) (model.userData.update as ((dt: number) => void) | undefined)?.(dt);
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
