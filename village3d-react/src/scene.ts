// ONE MORE DAWN — 3D village scene (React edition, v2 "dawn is coming").
// Framework-agnostic: createVillageScene(container, hooks) builds the diorama
// and exposes a live API the React HUD drives:
//   setTimeOfDay('night'|'dawn'|'day'|'dusk')  — smoothly lerped environment
//   setVillagers(n)                            — 0..6 walking villagers
//   setCompanion('horse'|'flamingo'|'parrot'|'stork', on)
// Bigger 32×32 island: walled town, pier over the water, orchard, training
// yard, campfire plaza, memorial. Deterministic seeded layout; characters are
// the official three.js example models in /assets.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type BuildingMeta = { name: string; level: number; blurb: string };
export type TimeOfDay = 'night' | 'dawn' | 'day' | 'dusk';
export type CompanionKind = 'horse' | 'flamingo' | 'parrot' | 'stork';

export type VillageHooks = {
  onProgress: (pct: number) => void;
  onLoad: () => void;
  onSelect: (meta: BuildingMeta | null) => void;
};

export type VillageHandle = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setVillagers: (n: number) => void;
  setCompanion: (kind: CompanionKind, on: boolean) => void;
  dispose: () => void;
  pause: () => void;
  resume: () => void;
  frame: () => void;
};

export const MAX_VILLAGERS = 6;

// ---------- seeded rng ----------
const makeRng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------- palette ----------
const C = {
  grassA: 0x7ab648, grassB: 0x6da53f,
  path: 0xd9c79b, pathB: 0xcdb98c,
  cliff: 0x8a5a33, cliffDark: 0x6e4527,
  water: 0x2e6b8a,
  timber: 0x9a6b3f, timberDark: 0x7d5430,
  stone: 0x9a938a, stoneDark: 0x7c756c,
  roofGold: 0xe8c34a, roofRed: 0xc85040, roofBlue: 0x6c8be0, roofGreen: 0x57c06a, roofSlate: 0x6f6357,
  cropGreen: 0x8fd05c, cropDark: 0x5b8c3a,
  leaf: 0x4c8f3a, leafDark: 0x3e7830, trunk: 0x6e4527,
  rock: 0x8f8578,
};

// ---------- time-of-day presets ----------
type EnvPreset = {
  bg: number; fogNear: number; fogFar: number;
  hemiSky: number; hemiGround: number; hemiInt: number;
  sunColor: number; sunInt: number; sunPos: [number, number, number];
  stars: number;              // starfield opacity 0..1
  windowCol: number;          // unlit-vs-glowing windows/torch flames
  discCol: number; discScale: number; // the visible sun/moon disc
  campfire: number;           // point-light intensity at the fire pit
};

const PRESETS: Record<TimeOfDay, EnvPreset> = {
  night: {
    bg: 0x141b2d, fogNear: 40, fogFar: 150,
    hemiSky: 0x2a3654, hemiGround: 0x0c1018, hemiInt: 0.55,
    sunColor: 0x8fa5d8, sunInt: 0.4, sunPos: [-14, 30, -10],
    stars: 1, windowCol: 0xffc46a, discCol: 0xdfe8ff, discScale: 1.6, campfire: 22,
  },
  dawn: {
    bg: 0xe89a66, fogNear: 34, fogFar: 140,
    hemiSky: 0xffc9a0, hemiGround: 0x3a4034, hemiInt: 0.75,
    sunColor: 0xffb37a, sunInt: 1.7, sunPos: [34, 7, 14],
    stars: 0.3, windowCol: 0xffcf78, discCol: 0xffd9a8, discScale: 3.4, campfire: 10,
  },
  day: {
    bg: 0x9ac8e8, fogNear: 50, fogFar: 170,
    hemiSky: 0xfff2d8, hemiGround: 0x4a6b35, hemiInt: 0.95,
    sunColor: 0xfff0c2, sunInt: 2.4, sunPos: [22, 32, 15],
    stars: 0, windowCol: 0x5a4a34, discCol: 0xfff6d8, discScale: 1.4, campfire: 0,
  },
  dusk: {
    bg: 0xc2694a, fogNear: 38, fogFar: 150,
    hemiSky: 0xe8a06a, hemiGround: 0x2c2118, hemiInt: 0.65,
    sunColor: 0xff9a5a, sunInt: 1.2, sunPos: [-30, 8, 16],
    stars: 0.2, windowCol: 0xffc46a, discCol: 0xffb37a, discScale: 3.0, campfire: 16,
  },
};

export function createVillageScene(container: HTMLElement, hooks: VillageHooks): VillageHandle {
  const rng = makeRng(20260707);
  let disposed = false;

  // ---------- renderer / scene / camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PRESETS.dawn.bg);
  scene.fog = new THREE.Fog(PRESETS.dawn.bg, PRESETS.dawn.fogNear, PRESETS.dawn.fogFar);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 320);
  camera.position.set(19, 19, 25);

  const size = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(container);
  window.addEventListener('resize', size);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 1);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12;
  controls.maxDistance = 55;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = 1.15;
  controls.screenSpacePanning = false;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.addEventListener('change', () => {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -12, 12);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -12, 14);
    controls.target.y = 0;
  });

  // ---------- lights + sky machinery (lerped every frame toward the preset) ----------
  const hemi = new THREE.HemisphereLight(PRESETS.dawn.hemiSky, PRESETS.dawn.hemiGround, PRESETS.dawn.hemiInt);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PRESETS.dawn.sunColor, PRESETS.dawn.sunInt);
  sun.position.set(...PRESETS.dawn.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -28;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // the visible sun / moon disc, sitting far out along the light direction
  const discMat = new THREE.MeshBasicMaterial({ color: PRESETS.dawn.discCol, fog: false });
  const disc = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), discMat);
  const discHalo = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 16, 12),
    new THREE.MeshBasicMaterial({ color: PRESETS.dawn.discCol, transparent: true, opacity: 0.28, fog: false }),
  );
  scene.add(disc, discHalo);

  // stars (visible at night, fading through dawn/dusk)
  const starMat = new THREE.PointsMaterial({ color: 0xf4ead8, size: 0.5, transparent: true, opacity: PRESETS.dawn.stars, depthWrite: false, fog: false });
  {
    const n = 420;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rng() * 2 - 1;
      const t = rng() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 120 + rng() * 80;
      pos[i * 3] = s * Math.cos(t) * r;
      pos[i * 3 + 1] = Math.abs(u) * r * 0.9 + 8;
      pos[i * 3 + 2] = s * Math.sin(t) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, starMat));
  }

  // shared glow material for windows / torch flames / tower lamps (lerped)
  const glowMat = new THREE.MeshBasicMaterial({ color: PRESETS.dawn.windowCol });

  // campfire light (plaza) — flickers, dies at midday
  const fireLight = new THREE.PointLight(0xff9a4a, PRESETS.dawn.campfire, 16);
  fireLight.position.set(8.6, 1.0, -8.4);
  scene.add(fireLight);

  // env lerp state
  const env = {
    bg: new THREE.Color(PRESETS.dawn.bg),
    hemiSky: new THREE.Color(PRESETS.dawn.hemiSky),
    hemiGround: new THREE.Color(PRESETS.dawn.hemiGround),
    sunColor: new THREE.Color(PRESETS.dawn.sunColor),
    windowCol: new THREE.Color(PRESETS.dawn.windowCol),
    discCol: new THREE.Color(PRESETS.dawn.discCol),
    sunPos: new THREE.Vector3(...PRESETS.dawn.sunPos),
    hemiInt: PRESETS.dawn.hemiInt,
    sunInt: PRESETS.dawn.sunInt,
    fogNear: PRESETS.dawn.fogNear,
    fogFar: PRESETS.dawn.fogFar,
    stars: PRESETS.dawn.stars,
    discScale: PRESETS.dawn.discScale,
    campfire: PRESETS.dawn.campfire,
  };
  let target: EnvPreset = PRESETS.dawn;

  const tBg = new THREE.Color();
  const tVec = new THREE.Vector3();
  function lerpEnv(dt: number) {
    const k = 1 - Math.exp(-dt * 1.6);
    env.bg.lerp(tBg.setHex(target.bg), k);
    env.hemiSky.lerp(tBg.setHex(target.hemiSky), k);
    env.hemiGround.lerp(tBg.setHex(target.hemiGround), k);
    env.sunColor.lerp(tBg.setHex(target.sunColor), k);
    env.windowCol.lerp(tBg.setHex(target.windowCol), k);
    env.discCol.lerp(tBg.setHex(target.discCol), k);
    env.sunPos.lerp(tVec.set(...target.sunPos), k);
    env.hemiInt += (target.hemiInt - env.hemiInt) * k;
    env.sunInt += (target.sunInt - env.sunInt) * k;
    env.fogNear += (target.fogNear - env.fogNear) * k;
    env.fogFar += (target.fogFar - env.fogFar) * k;
    env.stars += (target.stars - env.stars) * k;
    env.discScale += (target.discScale - env.discScale) * k;
    env.campfire += (target.campfire - env.campfire) * k;

    (scene.background as THREE.Color).copy(env.bg);
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(env.bg);
    fog.near = env.fogNear;
    fog.far = env.fogFar;
    hemi.color.copy(env.hemiSky);
    hemi.groundColor.copy(env.hemiGround);
    hemi.intensity = env.hemiInt;
    sun.color.copy(env.sunColor);
    sun.intensity = env.sunInt;
    sun.position.copy(env.sunPos);
    glowMat.color.copy(env.windowCol);
    discMat.color.copy(env.discCol);
    (discHalo.material as THREE.MeshBasicMaterial).color.copy(env.discCol);
    starMat.opacity = env.stars;
    // the disc rides the light direction, far out and never below the horizon
    tVec.copy(env.sunPos).normalize().multiplyScalar(150);
    tVec.y = Math.max(tVec.y, 5);
    disc.position.copy(tVec);
    discHalo.position.copy(tVec);
    disc.scale.setScalar(env.discScale);
    discHalo.scale.setScalar(env.discScale);
  }

  // ---------- materials / kit ----------
  const lam = (color: number, opts: Record<string, unknown> = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
  const MAT = {
    timber: lam(C.timber), timberDark: lam(C.timberDark),
    stone: lam(C.stone), stoneDark: lam(C.stoneDark),
    trunk: lam(C.trunk), rock: lam(C.rock),
    crop: lam(C.cropGreen), cropDark: lam(C.cropDark),
    plank: lam(0xb08a55),
  };

  const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const pyramid = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4), mat);
    m.scale.set(w * 1.42, h, d * 1.42);
    m.rotation.y = Math.PI / 4;
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  };
  const cyl = (r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 10) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const glowCube = (s: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), glowMat);
    m.position.set(x, y, z);
    return m;
  };

  // ---------- terrain: 32×32 island ----------
  const TILES = 32;
  const HALF = TILES / 2;
  const WALL_R = 13;
  {
    const tileGeo = new THREE.BoxGeometry(1, 0.14, 1);
    const grass = new THREE.InstancedMesh(tileGeo, lam(0xffffff), TILES * TILES);
    grass.receiveShadow = true;
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    let i = 0;
    const onPath = (x: number, z: number) =>
      (Math.abs(x) <= 1 && z >= 0) || // south road: hall → gate → pier
      (Math.abs(z) <= 0.6 && x >= -7 && x <= 0) || // west spur to the farm
      (Math.abs(z + 8.4) <= 0.6 && x >= 2 && x <= 8.6); // spur to the fire plaza
    for (let gx = 0; gx < TILES; gx++) {
      for (let gz = 0; gz < TILES; gz++) {
        const x = gx - HALF + 0.5;
        const z = gz - HALF + 0.5;
        m4.setPosition(x, -0.07, z);
        grass.setMatrixAt(i, m4);
        if (onPath(x, z)) col.setHex((gx + gz) % 2 ? C.path : C.pathB);
        else col.setHex((gx + gz) % 2 ? C.grassA : C.grassB);
        grass.setColorAt(i, col);
        i++;
      }
    }
    scene.add(grass);

    const cliff = new THREE.Mesh(new THREE.BoxGeometry(TILES, 2.2, TILES), lam(C.cliff));
    cliff.position.y = -1.24;
    scene.add(cliff);
    const cliffFoot = new THREE.Mesh(new THREE.BoxGeometry(TILES + 1.6, 0.9, TILES + 1.6), lam(C.cliffDark));
    cliffFoot.position.y = -2.4;
    scene.add(cliffFoot);

    const water = new THREE.Mesh(new THREE.CircleGeometry(400, 48), lam(C.water));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2.6;
    scene.add(water);
  }

  // ---------- interactables ----------
  const interactables: THREE.Group[] = [];
  function register(group: THREE.Group, x: number, z: number, meta: BuildingMeta, ringR: number) {
    group.position.set(x, 0, z);
    group.userData = { ...meta };
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ringR, ringR + 0.16, 28),
      new THREE.MeshBasicMaterial({ color: C.roofGold, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.visible = false;
    group.add(ring);
    group.userData.ring = ring;
    scene.add(group);
    interactables.push(group);
    return group;
  }

  // town hall
  let flag: THREE.Mesh | null = null;
  {
    const g = new THREE.Group();
    g.add(box(3.6, 0.5, 3.6, MAT.stoneDark, 0, 0.25, 0));
    g.add(box(3.0, 1.7, 3.0, MAT.timber, 0, 1.35, 0));
    g.add(box(3.2, 0.24, 3.2, MAT.timberDark, 0, 2.32, 0));
    g.add(pyramid(3.4, 1.7, 3.4, lam(C.roofGold), 0, 3.3, 0));
    g.add(box(0.9, 1.1, 0.12, MAT.timberDark, 0, 0.95, 1.51));
    g.add(glowCube(0.55, -1.0, 1.6, 1.51));
    g.add(glowCube(0.55, 1.0, 1.6, 1.51));
    g.add(cyl(0.05, 1.6, MAT.timberDark, 0, 4.9, 0, 6));
    flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), lam(C.roofGold, { side: THREE.DoubleSide }));
    flag.position.set(0.48, 5.35, 0);
    g.add(flag);
    register(g, 0, -1, { name: 'TOWN HALL', level: 4, blurb: 'The heart of the village. Every decision at dawn happens here.' }, 2.6);
  }

  // huts — 8 of them now
  const HUTS: [number, number, number, string][] = [
    [-3.6, 2.6, C.roofRed, 'A survivor family sleeps here.'],
    [3.4, 1.8, C.roofBlue, 'Woodsmoke and quiet talk after dark.'],
    [4.6, -2.6, C.roofGreen, 'They keep a candle in the window.'],
    [-4.4, -2.2, C.roofSlate, 'The door is always open to neighbors.'],
    [2.2, 5.4, C.roofRed, 'Close to the gate — first to hear news.'],
    [7.8, 7.4, C.roofBlue, 'New timber — raised after the last raid.'],
    [-5.4, -8.8, C.roofRed, 'The baker lives here. Everyone knows.'],
    [8.6, -3.4, C.roofGreen, 'They watch the windmill turn all evening.'],
  ];
  for (const [hx, hz, roof, blurb] of HUTS) {
    const g = new THREE.Group();
    g.add(box(1.5, 1.0, 1.5, MAT.timber, 0, 0.5, 0));
    g.add(pyramid(1.8, 1.0, 1.8, lam(roof), 0, 1.5, 0));
    g.add(box(0.5, 0.65, 0.1, MAT.timberDark, 0, 0.42, 0.78));
    g.add(glowCube(0.3, 0.45, 0.62, 0.77));
    g.rotation.y = rng() * Math.PI * 2;
    register(g, hx, hz, { name: 'HUT', level: 1 + Math.floor(rng() * 3), blurb }, 1.4);
  }

  // farm
  {
    const g = new THREE.Group();
    const W = 4.4, D = 3.2;
    g.add(box(W, 0.1, D, MAT.cropDark, 0, 0.06, 0));
    for (let r = 0; r < 4; r++) g.add(box(W - 0.7, 0.22, 0.34, MAT.crop, 0, 0.2, -D / 2 + 0.65 + r * 0.72));
    const post = (x: number, z: number) => g.add(box(0.12, 0.55, 0.12, MAT.timberDark, x, 0.28, z));
    for (let x = -W / 2; x <= W / 2 + 0.01; x += 1.1) { post(x, -D / 2); post(x, D / 2); }
    for (let z = -D / 2; z <= D / 2 + 0.01; z += 1.06) { post(-W / 2, z); post(W / 2, z); }
    g.add(box(W, 0.07, 0.07, MAT.timber, 0, 0.45, -D / 2));
    g.add(box(W, 0.07, 0.07, MAT.timber, 0, 0.45, D / 2));
    g.add(box(0.07, 0.07, D, MAT.timber, -W / 2, 0.45, 0));
    g.add(box(0.07, 0.07, D, MAT.timber, W / 2, 0.45, 0));
    register(g, -7, 1.4, { name: 'FARM', level: 3, blurb: 'Grow Food happens here. The greenhouse rows feed the city.' }, 2.9);
  }

  // windmill
  let rotor: THREE.Group | null = null;
  {
    const g = new THREE.Group();
    g.add(box(1.7, 0.4, 1.7, MAT.stoneDark, 0, 0.2, 0));
    g.add(box(1.4, 2.4, 1.4, lam(0xb7ab9c), 0, 1.6, 0));
    g.add(pyramid(1.7, 1.0, 1.7, lam(C.roofSlate), 0, 3.3, 0));
    g.add(box(0.5, 0.6, 0.1, MAT.timberDark, 0, 1.0, 0.71));
    g.add(cyl(0.09, 0.7, MAT.timberDark, 0, 2.6, 0.9, 6));
    rotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i / 4) * Math.PI * 2 + Math.PI / 4;
      arm.add(box(0.34, 1.6, 0.06, lam(0xe7dcc4), 0, 1.0, 0));
      rotor.add(arm);
    }
    rotor.position.set(0, 2.6, 1.26);
    g.add(rotor);
    register(g, 6.6, -5.6, { name: 'GENERATOR', level: 2, blurb: 'Repair Power keeps these blades — and the night lights — turning.' }, 1.9);
  }

  // clinic
  {
    const g = new THREE.Group();
    g.add(box(2.2, 1.2, 1.8, lam(0xd9d2c5), 0, 0.6, 0));
    g.add(pyramid(2.5, 0.9, 2.1, lam(C.roofRed), 0, 1.65, 0));
    g.add(box(0.55, 0.16, 0.16, lam(C.roofRed), 0, 1.0, 0.92));
    g.add(box(0.16, 0.55, 0.16, lam(C.roofRed), 0, 1.0, 0.92));
    register(g, -6.2, -4.6, { name: 'CLINIC', level: 2, blurb: 'Treat Sick — the medics hold the line against the fever.' }, 1.8);
  }

  // storehouse
  {
    const g = new THREE.Group();
    g.add(cyl(0.95, 1.7, MAT.timber, 0, 0.85, 0, 12));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.9, 12), lam(C.roofSlate));
    roof.position.y = 2.15;
    roof.castShadow = true;
    g.add(roof);
    register(g, 6.4, 1.6, { name: 'STOREHOUSE', level: 3, blurb: 'Every loaf the expeditions bank ends up behind these walls.' }, 1.5);
  }

  // watchtowers + gate + walls (pushed out to WALL_R)
  const TOWERS: [number, number][] = [[-WALL_R, -WALL_R], [WALL_R, -WALL_R], [-WALL_R, WALL_R], [WALL_R, WALL_R]];
  for (const [tx, tz] of TOWERS) {
    const g = new THREE.Group();
    g.add(box(1.1, 2.6, 1.1, MAT.stone, 0, 1.3, 0));
    g.add(box(1.5, 0.35, 1.5, MAT.stoneDark, 0, 2.8, 0));
    g.add(pyramid(1.5, 0.9, 1.5, lam(C.roofSlate), 0, 3.4, 0));
    g.add(glowCube(0.26, 0, 2.6, 0.62));
    register(g, tx, tz, { name: 'WATCHTOWER', level: 2, blurb: 'Guard Wall duty. The watch sees the raiders first.' }, 1.3);
  }
  {
    const g = new THREE.Group();
    g.add(box(0.8, 1.9, 0.8, MAT.stone, -1.6, 0.95, 0));
    g.add(box(0.8, 1.9, 0.8, MAT.stone, 1.6, 0.95, 0));
    g.add(box(4.0, 0.5, 0.7, MAT.stoneDark, 0, 2.1, 0));
    g.add(glowCube(0.22, -1.6, 2.0, 0.42));
    g.add(glowCube(0.22, 1.6, 2.0, 0.42));
    register(g, 0, WALL_R, { name: 'SOUTH GATE', level: 1, blurb: 'The only way in. Refugee convoys knock here at dusk.' }, 2.2);
  }
  {
    const segGeo = new THREE.BoxGeometry(1.36, 1.0, 0.45);
    const capGeo = new THREE.BoxGeometry(1.36, 1.22, 0.6);
    let n = 0;
    const wallSeg = (x: number, z: number, rotY: number) => {
      const cap = n % 4 === 3;
      const m = new THREE.Mesh(cap ? capGeo : segGeo, cap ? MAT.stoneDark : MAT.stone);
      m.position.set(x, cap ? 0.61 : 0.5, z);
      m.rotation.y = rotY;
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      n++;
    };
    for (let i = 0; i < 17; i++) {
      const c = -11.2 + i * 1.4;
      wallSeg(c, -WALL_R, 0);
      if (Math.abs(c) >= 1.9) wallSeg(c, WALL_R, 0);
      wallSeg(-WALL_R, c, Math.PI / 2);
      wallSeg(WALL_R, c, Math.PI / 2);
    }
  }

  // barracks
  {
    const g = new THREE.Group();
    g.add(box(3.0, 0.3, 2.2, MAT.stoneDark, 0, 0.15, 0));
    g.add(box(2.6, 1.3, 1.8, MAT.timber, 0, 0.95, 0));
    g.add(pyramid(3.0, 1.0, 2.2, lam(C.roofSlate), 0, 2.1, 0));
    g.add(box(0.6, 0.8, 0.1, MAT.timberDark, 0, 0.7, 0.92));
    g.add(cyl(0.05, 1.2, MAT.timberDark, -1.1, 2.5, 0.6, 6));
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), lam(C.roofRed, { side: THREE.DoubleSide }));
    banner.position.set(-0.85, 2.6, 0.6);
    g.add(banner);
    register(g, -3.2, 7.0, { name: 'BARRACKS', level: 2, blurb: 'Where guards drill for the raid. Prepare for Raid starts here.' }, 2.0);
  }

  // training yard (dummies + archery target) — NE of the barracks
  {
    const g = new THREE.Group();
    for (const [dx, dz] of [[-0.9, 0.3], [0, -0.5], [0.9, 0.4]] as const) {
      g.add(cyl(0.08, 0.7, MAT.trunk, dx, 0.35, dz, 6));
      g.add(box(0.3, 0.3, 0.3, MAT.timber, dx, 0.85, dz));
    }
    const tgt = new THREE.Group();
    const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), lam(0xe7dcc4));
    const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), lam(C.roofRed));
    const ring3 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12), lam(0x2a2118));
    for (const r of [ring1, ring2, ring3]) { r.rotation.x = Math.PI / 2; r.castShadow = true; tgt.add(r); }
    tgt.position.set(2.1, 0.8, 0);
    g.add(tgt);
    g.add(cyl(0.07, 0.8, MAT.timberDark, 2.1, 0.4, 0, 6));
    register(g, -7.6, 8.6, { name: 'TRAINING YARD', level: 1, blurb: 'Straw dummies and a battered target. Guards drill at first light.' }, 2.2);
  }

  // market stall
  {
    const g = new THREE.Group();
    for (const [px, pz] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]] as const) g.add(cyl(0.07, 1.2, MAT.timberDark, px, 0.6, pz, 6));
    for (let i = 0; i < 4; i++) {
      const strip = box(0.5, 0.06, 1.6, lam(i % 2 ? 0xe7dcc4 : C.roofRed), -0.75 + i * 0.5, 1.28, 0);
      strip.rotation.z = 0.14;
      g.add(strip);
    }
    g.add(box(1.7, 0.5, 1.0, MAT.timber, 0, 0.55, 0));
    g.add(box(0.28, 0.28, 0.28, lam(C.roofGold), -0.3, 0.94, 0.1));
    g.add(box(0.24, 0.24, 0.24, lam(C.roofGreen), 0.25, 0.92, -0.15));
    register(g, 2.0, -5.0, { name: 'MARKET', level: 1, blurb: 'Share Rations happens here — the ledger remembers generosity.' }, 1.6);
  }

  // well
  {
    const g = new THREE.Group();
    g.add(cyl(0.55, 0.5, MAT.stone, 0, 0.25, 0, 12));
    const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), lam(C.water));
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.51;
    g.add(waterDisc);
    g.add(cyl(0.06, 1.0, MAT.timberDark, -0.45, 0.75, 0, 6));
    g.add(cyl(0.06, 1.0, MAT.timberDark, 0.45, 0.75, 0, 6));
    const bar = cyl(0.05, 1.0, MAT.timber, 0, 1.2, 0, 6);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);
    g.add(pyramid(1.3, 0.5, 1.0, lam(C.roofSlate), 0, 1.55, 0));
    register(g, 1.9, 2.9, { name: 'WELL', level: 1, blurb: 'Clean water — the quiet reason the city is still alive.' }, 1.2);
  }

  // memorial — a candle for the Marked
  {
    const g = new THREE.Group();
    g.add(box(0.9, 0.3, 0.9, MAT.stoneDark, 0, 0.15, 0));
    g.add(box(0.6, 0.5, 0.6, MAT.stone, 0, 0.55, 0));
    g.add(cyl(0.1, 0.5, lam(0xe7dcc4), 0, 1.05, 0, 8));
    g.add(glowCube(0.16, 0, 1.4, 0));
    register(g, -2.4, 1.5, { name: 'MEMORIAL', level: 1, blurb: 'A candle for every Marked the city saved. It never goes out.' }, 1.0);
  }

  // campfire plaza (SE) — log ring + fire (the point light lives here)
  {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const log = cyl(0.14, 0.9, MAT.trunk, Math.cos(a) * 1.3, 0.14, Math.sin(a) * 1.3, 6);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = a;
      g.add(log);
    }
    g.add(cyl(0.5, 0.12, MAT.stoneDark, 0, 0.06, 0, 10));
    g.add(glowCube(0.3, 0, 0.35, 0));
    g.add(glowCube(0.2, 0.15, 0.55, 0.1));
    register(g, 8.6, -8.4, { name: 'FIRE PIT', level: 1, blurb: 'Stories after dark. The drama feed, but out loud.' }, 1.7);
  }

  // pier + boat — south, over the water
  {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) g.add(box(1.6, 0.12, 0.9, MAT.plank, 0, -0.1, i * 0.95));
    for (const [px, pz] of [[-0.7, 0.4], [0.7, 0.4], [-0.7, 2.3], [0.7, 2.3], [-0.7, 4.2], [0.7, 4.2]] as const) {
      g.add(cyl(0.09, 2.4, MAT.timberDark, px, -1.2, pz, 6));
    }
    const boat = new THREE.Group();
    boat.add(box(1.0, 0.35, 2.2, MAT.timberDark, 0, 0, 0));
    boat.add(box(0.7, 0.25, 1.6, lam(0x8a5a33), 0, 0.15, 0));
    boat.add(cyl(0.05, 1.4, MAT.timberDark, 0, 0.8, -0.3, 6));
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), lam(0xe7dcc4, { side: THREE.DoubleSide }));
    sail.position.set(0, 0.95, -0.28);
    boat.add(sail);
    boat.position.set(1.9, -2.38, 3.2); // hull sits in the water, not above it
    boat.rotation.y = 0.4;
    g.add(boat);
    register(g, 0, 16.4, { name: 'THE PIER', level: 1, blurb: 'Expeditions push off from here into the drowned ruins.' }, 2.4);
  }

  // torches along the road (glow material — bright at night, dead by day)
  for (const [tx, tz] of [[-1.4, 3.4], [1.4, 3.4], [-1.4, 6.8], [1.4, 6.8], [-1.4, 10.4], [1.4, 10.4]] as const) {
    scene.add(cyl(0.07, 0.9, MAT.timberDark, tx, 0.45, tz, 6));
    scene.add(glowCube(0.16, tx, 0.98, tz));
  }

  // orchard (NW): two rows of round fruit trees
  {
    for (let i = 0; i < 6; i++) {
      const x = -11 + (i % 3) * 1.9;
      const z = -9.6 + Math.floor(i / 3) * 2.1;
      const g = new THREE.Group();
      g.add(cyl(0.1, 0.5, MAT.trunk, 0, 0.25, 0, 6));
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 1), lam(C.leaf, { flatShading: true }));
      canopy.position.y = 0.95;
      canopy.castShadow = true;
      g.add(canopy);
      g.position.set(x, 0, z);
      scene.add(g);
    }
  }

  // decorations: tree ring, rocks, flowers, bushes
  {
    const clearSpot = (x: number, z: number): boolean => {
      const spots: [number, number, number][] = [
        [0, -1, 2.9], [-3.6, 2.6, 1.3], [3.4, 1.8, 1.3], [4.6, -2.6, 1.3], [-4.4, -2.2, 1.3],
        [2.2, 5.4, 1.3], [7.8, 7.4, 1.3], [-5.4, -8.8, 1.3], [8.6, -3.4, 1.3],
        [6.6, -5.6, 1.4], [-6.2, -4.6, 1.4], [6.4, 1.6, 1.3], [0, WALL_R, 2.0],
        [-3.2, 7.0, 1.6], [-7.6, 8.6, 2.2], [2.0, -5.0, 1.4], [1.9, 2.9, 1.2],
        [-2.4, 1.5, 1.0], [8.6, -8.4, 1.8],
      ];
      for (const [sx, sz, sr] of spots) if (Math.hypot(x - sx, z - sz) < sr) return false;
      if (x >= -9.2 && x <= -4.8 && z >= -0.2 && z <= 3.0) return false; // farm
      if (Math.abs(x) <= 1.6 && z >= 0) return false; // south road
      if (Math.abs(z) <= 1.2 && x >= -7 && x <= 0) return false; // west spur
      if (Math.abs(z + 8.4) <= 1.2 && x >= 2 && x <= 8.6) return false; // plaza spur
      if (Math.abs(x) <= 1.4 && z >= 1.0 && z <= 12.4) return false; // route: road patrol
      if (x >= -6.0 && x <= -0.6 && z >= -2.2 && z <= 1.0) return false; // route: west loop
      if (x >= 1.8 && x <= 6.0 && z >= 0.2 && z <= 4.2) return false; // route: east loop
      if (x >= -8.2 && x <= -3.4 && z >= 4.2 && z <= 7.0) return false; // pasture
      if (x >= -12.2 && x <= -6.4 && z >= -10.4 && z <= -6.8) return false; // orchard (3 columns to x=-7.2)
      return true;
    };
    const tree = (x: number, z: number, pine: boolean) => {
      const g = new THREE.Group();
      const s = 0.8 + rng() * 0.5;
      g.add(cyl(0.12 * s, 0.5 * s, MAT.trunk, 0, 0.25 * s, 0, 6));
      if (pine) {
        const m1 = new THREE.Mesh(new THREE.ConeGeometry(0.62 * s, 1.0 * s, 7), lam(C.leafDark));
        m1.position.y = 0.9 * s; m1.castShadow = true; g.add(m1);
        const m2 = new THREE.Mesh(new THREE.ConeGeometry(0.45 * s, 0.8 * s, 7), lam(C.leaf));
        m2.position.y = 1.45 * s; m2.castShadow = true; g.add(m2);
      } else {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 * s, 1), lam(C.leaf, { flatShading: true }));
        m.position.y = 0.95 * s; m.castShadow = true; g.add(m);
      }
      g.position.set(x, 0, z);
      scene.add(g);
    };
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2 + rng() * 0.2;
      const r = 14.2 + rng() * 1.2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 2.6 && z > 11) continue; // gate + pier corridor
      if (Math.max(Math.abs(x), Math.abs(z)) > HALF - 0.8) continue;
      if (TOWERS.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 2.2)) continue;
      tree(x, z, rng() > 0.45);
    }
    for (let i = 0; i < 10; i++) {
      const x = (rng() * 2 - 1) * 11.5;
      const z = (rng() * 2 - 1) * 11.5;
      if (!clearSpot(x, z) || Math.hypot(x, z) < 5.5) continue;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rng() * 0.3, 0), lam(C.rock, { flatShading: true }));
      rock.position.set(x, 0.2, z);
      rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      rock.castShadow = true;
      scene.add(rock);
    }
    const flowerGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const flowerMats = [lam(0xe86a6a), lam(0xe8c34a), lam(0xffffff)];
    let placed = 0;
    for (let tries = 0; tries < 140 && placed < 24; tries++) {
      const r = Math.sqrt(rng()) * 11.5;
      const a = rng() * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!clearSpot(x, z)) continue;
      const f = new THREE.Mesh(flowerGeo, flowerMats[Math.floor(rng() * 3)]!);
      f.position.set(x, 0.08, z);
      scene.add(f);
      placed++;
    }
    let bushes = 0;
    for (let tries = 0; tries < 90 && bushes < 10; tries++) {
      const r = Math.sqrt(rng()) * 11.5;
      const a = rng() * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!clearSpot(x, z)) continue;
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), lam(C.leaf, { flatShading: true }));
      b.position.set(x, 0.2, z);
      b.castShadow = true;
      scene.add(b);
      bushes++;
    }
  }

  // ---------- characters (dynamic population) ----------
  type Actor = { obj: THREE.Object3D; mixer: THREE.AnimationMixer; walker?: (dt: number) => void };
  const actors = new Set<Actor>();
  const orbiters = new Map<CompanionKind, { actor: Actor; radius: number; height: number; speed: number; phase: number }>();

  const loadManager = new THREE.LoadingManager();
  const loader = new GLTFLoader(loadManager);
  loadManager.onProgress = (_url, done, total) => hooks.onProgress(Math.round((done / total) * 100));
  loadManager.onLoad = () => hooks.onLoad();
  loadManager.onError = () => hooks.onProgress(100);
  const gltfCache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>();
  const loadGlb = (file: string) => {
    if (!gltfCache.has(file)) {
      gltfCache.set(file, new Promise((res, rej) => loader.load(`/assets/${file}`, (g) => res(g as never), undefined, rej)));
    }
    return gltfCache.get(file)!;
  };

  function prep(root: THREE.Object3D, targetSize: number) {
    const s = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    root.scale.multiplyScalar(targetSize / Math.max(0.0001, s.x, s.y, s.z));
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    return root;
  }
  const humanize = (root: THREE.Object3D) => {
    root.scale.setScalar(0.92); // Soldier.glb is authored human-scale (skinned Box3 lies)
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
  };

  function makeWalker(obj: THREE.Object3D, points: [number, number][], speed: number) {
    let seg = 0;
    let t = 0;
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    return (dt: number) => {
      const a = points[seg % points.length]!;
      const b = points[(seg + 1) % points.length]!;
      from.set(a[0], 0, a[1]);
      to.set(b[0], 0, b[1]);
      const dist = from.distanceTo(to);
      t += (dt * speed) / Math.max(0.001, dist);
      if (t >= 1) { t = 0; seg = (seg + 1) % points.length; return; }
      obj.position.lerpVectors(from, to, t);
      obj.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    };
  }

  // six villager routes across the larger town
  const ROUTES: { pts: [number, number][]; speed: number }[] = [
    { pts: [[0.8, 8.5], [0.8, 1.6], [-0.8, 1.6], [-0.8, 8.5]], speed: 1.5 },
    { pts: [[-1.2, 0.4], [-5.4, 0.4], [-5.4, -1.6], [-1.2, -1.6]], speed: 1.2 },
    { pts: [[2.4, 0.8], [5.4, 0.8], [5.4, 3.6], [2.4, 3.6]], speed: 1.35 },
    { pts: [[0.8, 12.2], [0.8, 9.6], [-0.8, 9.6], [-0.8, 12.2]], speed: 1.1 },
    { pts: [[2.6, -7.9], [6.6, -7.9], [6.6, -9.0], [2.6, -9.0]], speed: 1.3 }, // stops short of the fire-pit logs
    { pts: [[-9.4, -2.4], [-11.4, -2.4], [-11.4, -5.6], [-9.4, -5.6]], speed: 1.05 },
  ];
  const villagers: Actor[] = [];
  let guard: Actor | null = null;
  let wantedVillagers = 3;

  async function syncVillagers() {
    const gltf = await loadGlb('Soldier.glb');
    if (disposed) return;
    const clips = gltf.animations;
    const clip = (re: RegExp, fb: number) => clips.find((c) => re.test(c.name)) ?? clips[fb]!;
    // the gate guard exists whenever there is at least one villager
    if (wantedVillagers > 0 && !guard) {
      const g = SkeletonUtils.clone(gltf.scene);
      humanize(g);
      g.position.set(2.4, 0, 12.6);
      g.rotation.y = -Math.PI / 2;
      scene.add(g);
      const mixer = new THREE.AnimationMixer(g);
      mixer.clipAction(clip(/idle/i, 0)).play();
      guard = { obj: g, mixer };
      actors.add(guard);
    }
    if (wantedVillagers === 0 && guard) {
      scene.remove(guard.obj);
      actors.delete(guard);
      guard = null;
    }
    while (villagers.length < wantedVillagers) {
      const idx = villagers.length;
      const v = SkeletonUtils.clone(gltf.scene);
      humanize(v);
      scene.add(v);
      const mixer = new THREE.AnimationMixer(v);
      mixer.clipAction(clip(/walk/i, 3)).play();
      const route = ROUTES[idx % ROUTES.length]!;
      const actor: Actor = { obj: v, mixer, walker: makeWalker(v, route.pts, route.speed) };
      villagers.push(actor);
      actors.add(actor);
    }
    while (villagers.length > wantedVillagers) {
      const actor = villagers.pop()!;
      scene.remove(actor.obj);
      actors.delete(actor);
    }
  }

  const COMPANIONS: Record<CompanionKind, { file: string; size: number; orbit?: [number, number, number, number] }> = {
    horse: { file: 'Horse.glb', size: 2.1 },
    flamingo: { file: 'Flamingo.glb', size: 1.4, orbit: [6.4, 7.2, 0.28, 0] },
    parrot: { file: 'Parrot.glb', size: 1.4, orbit: [4.6, 6.2, 0.38, 2.2] },
    stork: { file: 'Stork.glb', size: 1.4, orbit: [9.0, 8.4, 0.22, 4.1] },
  };
  const companions = new Map<CompanionKind, Actor>();

  async function setCompanion(kind: CompanionKind, on: boolean) {
    if (!on) {
      const actor = companions.get(kind);
      if (actor) {
        scene.remove(actor.obj);
        actors.delete(actor);
        companions.delete(kind);
        orbiters.delete(kind);
      }
      return;
    }
    if (companions.has(kind)) return;
    const def = COMPANIONS[kind];
    const gltf = await loadGlb(def.file);
    if (disposed || companions.has(kind)) return;
    const obj = SkeletonUtils.clone(gltf.scene);
    prep(obj, def.size);
    scene.add(obj);
    const mixer = new THREE.AnimationMixer(obj);
    if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
    const actor: Actor = { obj, mixer };
    if (kind === 'horse') {
      actor.walker = makeWalker(obj, [[-7.6, 4.6], [-4.9, 4.7], [-5.4, 6.4], [-7.2, 6.4]], 1.1);
    } else if (def.orbit) {
      orbiters.set(kind, { actor, radius: def.orbit[0], height: def.orbit[1], speed: def.orbit[2], phase: def.orbit[3] });
    }
    companions.set(kind, actor);
    actors.add(actor);
  }

  // defaults: 3 villagers + guard, horse, all three birds
  void syncVillagers();
  void setCompanion('horse', true);
  void setCompanion('flamingo', true);
  void setCompanion('parrot', true);
  void setCompanion('stork', true);

  // ---------- hover / select ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered: THREE.Group | null = null;
  let selected: THREE.Group | null = null;
  const rootOf = (obj: THREE.Object3D | null): THREE.Group | null => {
    let cur: THREE.Object3D | null = obj;
    while (cur && !(cur.userData as BuildingMeta).name) cur = cur.parent;
    return (cur as THREE.Group) ?? null;
  };
  const pick = (clientX: number, clientY: number): THREE.Group | null => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(interactables, true)[0];
    return hit ? rootOf(hit.object) : null;
  };
  const setRing = (group: THREE.Group | null, on: boolean) => {
    const ring = group?.userData.ring as THREE.Mesh | undefined;
    if (ring) ring.visible = on;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const g = pick(e.clientX, e.clientY);
    if (g !== hovered) {
      if (hovered !== selected) setRing(hovered, false);
      hovered = g;
      if (hovered) setRing(hovered, true);
      renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
    }
  };
  let downAt: [number, number] | null = null;
  const onDown = (e: PointerEvent) => { downAt = [e.clientX, e.clientY]; };
  const onUp = (e: PointerEvent) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved > 8) return;
    const g = pick(e.clientX, e.clientY);
    if (selected && selected !== g) setRing(selected, false);
    selected = g;
    if (g) {
      setRing(g, true);
      const { name, level, blurb } = g.userData as BuildingMeta;
      hooks.onSelect({ name, level, blurb });
    } else {
      hooks.onSelect(null);
    }
  };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  // ---------- main loop ----------
  const clock = new THREE.Clock();
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    controls.update();
    lerpEnv(dt);
    for (const a of actors) {
      a.mixer.update(dt);
      a.walker?.(dt);
    }
    for (const [, o] of orbiters) {
      const a = t * o.speed + o.phase;
      o.actor.obj.position.set(Math.cos(a) * o.radius, o.height + Math.sin(t * 1.7 + o.phase) * 0.4, Math.sin(a) * o.radius);
      o.actor.obj.rotation.y = -a;
    }
    if (flag) flag.rotation.y = Math.sin(t * 2.4) * 0.35;
    if (rotor) rotor.rotation.z = t * 2.2;
    // fire flicker rides on top of the lerped base intensity
    fireLight.intensity = Math.max(0, env.campfire + Math.sin(t * 9.3) * env.campfire * 0.25 + Math.sin(t * 23.7) * env.campfire * 0.12);
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(tick);

  const handle: VillageHandle = {
    setTimeOfDay: (tod) => {
      target = PRESETS[tod];
    },
    setVillagers: (n) => {
      wantedVillagers = Math.max(0, Math.min(MAX_VILLAGERS, Math.round(n)));
      void syncVillagers();
    },
    setCompanion: (kind, on) => {
      void setCompanion(kind, on);
    },
    pause: () => renderer.setAnimationLoop(null),
    resume: () => renderer.setAnimationLoop(tick),
    frame: () => tick(),
    dispose: () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      window.removeEventListener('resize', size);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };

  (window as unknown as Record<string, unknown>).__village = { ...handle, camera, controls, scene, renderer };
  return handle;
}
