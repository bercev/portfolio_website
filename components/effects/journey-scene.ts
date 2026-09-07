import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import {
  PATH_END_T,
  SECTION_PATH_T,
  journeyLookName,
  mapSectionScrollToJourneyT,
  resolveJourneyLookTarget,
} from "./journey-camera";

export type JourneyQuality = "full" | "mobile";

export type JourneyPalette = {
  readonly accent: string;
  readonly cyan: string;
  readonly emerald: string;
  readonly amber: string;
  readonly coral: string;
};

export type JourneySceneOptions = {
  readonly canvas: HTMLCanvasElement;
  readonly quality: JourneyQuality;
  readonly reducedMotion: boolean;
  readonly spaceBg: string;
  readonly fog: string;
  readonly palette: JourneyPalette;
  /** Orbit dust count per station — mirrors portfolio content (papers, roles, projects, skills). */
  readonly stationCounts: readonly number[];
  /**
   * Light clear colors cannot use additive particle blending — mid/dark glyph
   * colors add almost nothing on #eef5fb, so BERAT/CONNECT vanish. Normal
   * blending keeps ink readable; bloom stays dark-only for the same reason.
   */
  readonly lightTheme?: boolean;
  readonly onProgress?: (t: number) => void;
};

/** Draw a word as a particle cloud shaped by a canvas-rendered glyph mask. */
function buildTextPoints(
  text: string,
  count: number,
  palette: JourneyPalette,
  worldH = 7,
  blending: THREE.Blending = THREE.AdditiveBlending,
  ink = false,
): THREE.Points {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for journey text");
  const fontPx = 220;
  ctx.font = `800 ${fontPx}px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif`;
  const m = ctx.measureText(text);
  c.width = Math.ceil(m.width) + 40;
  c.height = fontPx * 1.4;
  ctx.font = `800 ${fontPx}px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, c.height / 2);

  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const candidates: Array<[number, number]> = [];
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (data[(y * c.width + x) * 4 + 3] > 128) candidates.push([x, y]);
    }
  }

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const aspect = c.width / c.height;
  const worldW = worldH * aspect;
  /*
   * Warm stops read as sparkle against a black clear and as dirt against
   * paper, so the light wordmark stays inside one tonal family.
   */
  const colorStops = ink
    ? [
        new THREE.Color(palette.accent),
        new THREE.Color(palette.cyan),
        new THREE.Color(palette.accent).multiplyScalar(0.7),
        new THREE.Color(palette.emerald).lerp(new THREE.Color(palette.accent), 0.8),
      ]
    : [
        new THREE.Color(palette.accent),
        new THREE.Color(palette.cyan),
        new THREE.Color(palette.emerald),
        new THREE.Color(0xffffff).lerp(new THREE.Color(palette.accent), 0.45),
      ];
  for (let i = 0; i < count; i++) {
    const [px, py] = candidates[(Math.random() * candidates.length) | 0] ?? [
      c.width / 2,
      c.height / 2,
    ];
    positions[i * 3] = (px / c.width - 0.5) * worldW + (Math.random() - 0.5) * 0.06;
    positions[i * 3 + 1] = -(py / c.height - 0.5) * worldH + (Math.random() - 0.5) * 0.06;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
    const col = colorStops[(Math.random() * colorStops.length) | 0];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending,
    uniforms: {
      uTime: { value: 0 },
      uScatter: { value: 0 },
    },
    vertexShader: `
      attribute float seed;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vFade;
      uniform float uTime;
      uniform float uScatter;
      void main() {
        vColor = color;
        vec3 p = position;
        vec3 dir = normalize(vec3(sin(seed * 3.1), cos(seed * 2.3), sin(seed * 5.7)));
        p += dir * uScatter * (9.0 + seed * 2.0);
        p.y += sin(uTime * 0.8 + seed) * 0.05;
        p.x += cos(uTime * 0.6 + seed * 1.7) * 0.04;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        gl_PointSize = min((1.25 + 1.5 * fract(seed)) * (${ink ? "58.0" : "100.0"} / dist), ${ink ? "8.0" : "14.0"});
        vFade = smoothstep(70.0, 18.0, dist) * smoothstep(1.5, 7.0, dist);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.05, d) * vFade${ink ? "" : " * 1.35"};
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });

  return new THREE.Points(geo, mat);
}

/**
 * One silhouette per chapter — different geometry families, never a box grid:
 *   0 About        — nested orbits around a knowledge core
 *   1 Publications — two interlocking knots (two papers)
 *   2 Experience   — four distinct polyhedra on one arc
 *   3 Projects     — a flowing ribbon + community rings
 *   4 Skills       — constellation rings with mixed gems
 *   5 Contact      — a core with three outbound flares
 */
const STATION_BUILDERS: ((color: THREE.Color) => THREE.Object3D)[] = [
  buildEducationMark,
  buildTwoPapers,
  buildRoleBadges,
  buildShippedWork,
  buildSkillRack,
  buildEnvelope,
];

/**
 * GLSL port of the vgpu wgsl-std simplex + fbm noise (Ashima 2D simplex),
 * used by the nebula backdrop shader.
 */
const GLSL_NOISE_2D = /* glsl */ `
  vec3 mod289(vec3 x) { return mod(x, 289.0); }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p);
      p = p * 2.03 + vec2(11.3, 7.7);
      a *= 0.5;
    }
    return v;
  }
`;

/** Blending for station materials — set per theme before buildStations runs. */
let stationBlending: THREE.Blending = THREE.AdditiveBlending;

/**
 * Every particle alpha here was tuned for additive blending on a near-black
 * clear, where overlapping sprites stay dim. Normal-blended on paper the same
 * values stack into flat fill, so light mode draws the whole scene as faint
 * ink instead.
 */
let inkAlpha = 1;

const FRENET_SEGMENTS = 64;

/** Viewport aspect the wordmark world width was authored against. */
const LANDSCAPE_FIT_ASPECT = 1.35;
/** World units the glyph rises by at the narrowest portrait viewports. */
const PORTRAIT_WORDMARK_LIFT = 4.4;
/** Hero BERAT world height — slightly under the original 9 so it does not crowd the masthead. */
const HERO_WORDMARK_HEIGHT = 8.15;
/** Extra hero-only shrink after the shared landscape/portrait fit. */
const HERO_WORDMARK_FIT = 0.96;
/**
 * Camera t when each page section is in focus. Contact stays short of 1 so
 * Skills → Contact still travels instead of completing the path.
 */
const SECTION_IDS = [
  "home",
  "about",
  "publications",
  "experience",
  "projects",
  "skills",
  "contact",
] as const;

/** Map page scroll to path t using section tops so later chapters keep travel. */
function mapScrollToJourneyT(): number {
  const vh = window.innerHeight;
  const y = Number.isFinite(window.scrollY) ? window.scrollY : 0;
  const max = document.documentElement.scrollHeight - vh;
  const anchors: Array<{ y: number; t: number }> = [];
  for (let i = 0; i < SECTION_IDS.length; i++) {
    const el = document.getElementById(SECTION_IDS[i]);
    if (!el) continue;
    anchors.push({
      y: el.getBoundingClientRect().top + window.scrollY,
      t: SECTION_PATH_T[i],
    });
  }

  return mapSectionScrollToJourneyT({
    scrollY: y,
    viewportH: vh,
    maxScroll: max,
    anchors,
  });
}

/** Sculpture wireframe: breathing pulse + vertical two-tone gradient. */
function stationMaterial(color: THREE.Color): THREE.ShaderMaterial {
  const glow = color.clone().lerp(new THREE.Color(0xffffff), 0.45);
  return new THREE.ShaderMaterial({
    wireframe: true,
    transparent: true,
    depthWrite: false,
    blending: stationBlending,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: Math.random() * Math.PI * 2 },
      uOpacity: { value: 0.62 * inkAlpha },
      uColorA: { value: color.clone() },
      uColorB: { value: glow },
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uTime;
      uniform float uSeed;
      uniform float uOpacity;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float pulse = 0.72 + 0.28 * sin(uTime * 1.3 + uSeed);
        vec3 col = mix(uColorA, uColorB, smoothstep(-2.2, 2.2, vPos.y));
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 1.55);
        gl_FragColor = vec4(col, uOpacity * pulse * (0.42 + 0.58 * fresnel));
      }
    `,
  });
}

/** Soft fresnel shell over each sculpture mesh — volumetric edge glow. */
function auraMaterial(color: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: stationBlending,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: Math.random() * Math.PI * 2 },
      uOpacity: {
        value: (stationBlending === THREE.AdditiveBlending ? 0.5 : 0.3) * inkAlpha,
      },
      uColor: { value: color.clone() },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uSeed;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.5);
        float pulse = 0.7 + 0.3 * sin(uTime * 1.1 + uSeed);
        gl_FragColor = vec4(uColor, fresnel * uOpacity * pulse);
      }
    `,
  });
}

function stationMesh(
  geometry: THREE.BufferGeometry,
  color: THREE.Color,
  position: readonly [number, number, number] = [0, 0, 0],
  rotation: readonly [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(geometry, stationMaterial(color));
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

type StationSpin = { y: number; x: number; bob: number };

function withSpin(group: THREE.Group, spin: StationSpin) {
  group.userData.spin = spin;
  return group;
}

/** About — nested orbits around a knowledge core, not an open book of boxes. */
function buildEducationMark(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  group.add(stationMesh(new THREE.IcosahedronGeometry(0.72, 0), color));
  group.add(
    stationMesh(new THREE.TorusGeometry(1.48, 0.045, 8, 48), color, [0, 0.08, 0], [
      Math.PI / 2.35,
      0.18,
      0,
    ]),
  );
  group.add(
    stationMesh(new THREE.TorusGeometry(1.12, 0.03, 6, 40), color, [0, 0.14, 0], [
      0.42,
      0.82,
      0.18,
    ]),
  );
  for (let i = 0; i < 7; i++) {
    const a = i * 0.78;
    group.add(
      stationMesh(new THREE.OctahedronGeometry(0.13, 0), color, [
        Math.cos(a) * 1.08,
        -0.92 + i * 0.3,
        Math.sin(a) * 1.08,
      ]),
    );
  }
  return withSpin(group, { y: 0.22, x: 0.06, bob: 0.16 });
}

/** Publications — two interlocking knots, one for each paper. */
function buildTwoPapers(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  group.add(
    stationMesh(
      new THREE.TorusKnotGeometry(1.12, 0.08, 96, 12, 2, 3),
      color,
      [-0.32, 0, 0],
      [0.38, 0.18, 0],
    ),
  );
  group.add(
    stationMesh(
      new THREE.TorusKnotGeometry(0.92, 0.065, 80, 10, 3, 2),
      color,
      [0.42, 0.12, 0.08],
      [-0.28, 0.52, 0.18],
    ),
  );
  group.add(
    stationMesh(new THREE.TorusGeometry(0.52, 0.038, 8, 32), color, [0, -0.18, 0.36], [
      1.12,
      0.18,
      0,
    ]),
  );
  return withSpin(group, { y: 0.16, x: 0.08, bob: 0.1 });
}

/** Experience — four different solids on one career arc. */
function buildRoleBadges(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  const solids: THREE.BufferGeometry[] = [
    new THREE.TetrahedronGeometry(0.55),
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.DodecahedronGeometry(0.48, 0),
    new THREE.IcosahedronGeometry(0.46, 0),
  ];
  for (let i = 0; i < solids.length; i++) {
    const a = (i / 3) * Math.PI * 0.92 - 0.46;
    group.add(
      stationMesh(solids[i], color, [
        Math.sin(a) * 2.05,
        Math.cos(a) * 0.52 - 0.18,
        -i * 0.2,
      ]),
    );
  }
  const arc = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-2.05, 0.18, 0.05),
    new THREE.Vector3(0, 1.15, -0.35),
    new THREE.Vector3(2.05, 0.12, -0.65),
  );
  group.add(stationMesh(new THREE.TubeGeometry(arc, 28, 0.032, 5, false), color));
  return withSpin(group, { y: 0.1, x: 0.04, bob: 0.14 });
}

/** Projects — a vitae ribbon beside two community rings. */
function buildShippedWork(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  const ribbon = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.15, -0.85, 0.18),
    new THREE.Vector3(-1.15, 0.42, -0.28),
    new THREE.Vector3(-0.15, 0.95, 0.12),
    new THREE.Vector3(0.42, 0.08, 0.38),
  ]);
  group.add(stationMesh(new THREE.TubeGeometry(ribbon, 42, 0.11, 8, false), color));
  group.add(
    stationMesh(new THREE.TorusGeometry(0.92, 0.075, 10, 28), color, [1.52, 0.22, 0], [
      0.48,
      0.28,
      0.16,
    ]),
  );
  group.add(
    stationMesh(new THREE.TorusGeometry(0.52, 0.04, 8, 22), color, [1.52, 0.22, 0], [
      1.18,
      0.08,
      -0.38,
    ]),
  );
  return withSpin(group, { y: 0.14, x: 0.05, bob: 0.12 });
}

/** Skills — concentric rings with mixed gems, not a tile rack. */
function buildSkillRack(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  group.add(
    stationMesh(new THREE.TorusGeometry(1.72, 0.038, 6, 48), color, [0, 0, 0], [
      Math.PI / 2,
      0,
      0,
    ]),
  );
  group.add(
    stationMesh(new THREE.TorusGeometry(1.12, 0.032, 6, 40), color, [0, 0, 0], [
      0.92,
      0.38,
      0.18,
    ]),
  );
  group.add(
    stationMesh(new THREE.TorusGeometry(0.58, 0.038, 6, 32), color, [0, 0, 0], [
      0.22,
      1.08,
      0.28,
    ]),
  );
  const gems: THREE.BufferGeometry[] = [
    new THREE.TetrahedronGeometry(0.2),
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.IcosahedronGeometry(0.16, 0),
  ];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    group.add(
      stationMesh(gems[i % 3], color, [
        Math.cos(a) * 1.72,
        Math.sin(a) * 0.32,
        Math.sin(a) * 1.72,
      ]),
    );
  }
  return withSpin(group, { y: 0.2, x: 0.07, bob: 0.08 });
}

/** Contact — a core with three outbound flares (GitHub, LinkedIn, resume). */
function buildEnvelope(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  group.add(stationMesh(new THREE.OctahedronGeometry(0.62, 0), color));
  const tips = [
    new THREE.Vector3(1.78, 1.08, 0.38),
    new THREE.Vector3(-1.58, 1.28, 0.18),
    new THREE.Vector3(0.18, 1.82, -0.78),
  ];
  for (const tip of tips) {
    const ray = new THREE.LineCurve3(new THREE.Vector3(0, 0.18, 0), tip);
    group.add(stationMesh(new THREE.TubeGeometry(ray, 8, 0.038, 5, false), color));
    group.add(stationMesh(new THREE.SphereGeometry(0.17, 10, 8), color, [tip.x, tip.y, tip.z]));
  }
  return withSpin(group, { y: 0.12, x: 0.05, bob: 0.18 });
}

export class JourneyScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly quality: JourneyQuality;
  private readonly reducedMotion: boolean;
  private readonly onProgress?: (t: number) => void;
  private readonly palette: JourneyPalette;

  private readonly composer: EffectComposer | null;
  private readonly curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, 15),
    new THREE.Vector3(0, 0.4, 7),
    new THREE.Vector3(6, 2, 0),
    new THREE.Vector3(9, -1, -8),
    new THREE.Vector3(3, 3, -18),
    new THREE.Vector3(-6, 1, -24),
    new THREE.Vector3(-10, -2, -34),
    new THREE.Vector3(-2, 2, -44),
    new THREE.Vector3(8, 0, -54),
    new THREE.Vector3(10, -2, -66),
    new THREE.Vector3(0, 1, -78),
    new THREE.Vector3(-8, 0, -90),
    new THREE.Vector3(-4, 2, -102),
    new THREE.Vector3(2, 0, -114),
    new THREE.Vector3(0, 0, -128),
  ]);
  private readonly frenet = this.curve.computeFrenetFrames(FRENET_SEGMENTS, false);
  private readonly stations: THREE.Object3D[] = [];
  private readonly orbitDust: THREE.Points[] = [];
  private readonly textGroup = new THREE.Group();
  private readonly arrivalGroup = new THREE.Group();
  private readonly textPoints: THREE.Points;
  private readonly arrivalPoints: THREE.Points;
  private readonly comet: THREE.Mesh;
  private readonly stars: THREE.Points;

  private readonly tangent = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3(0, 0, 0);
  private readonly pointer = { x: 0, y: 0 };
  private readonly timer = new THREE.Timer();
  private targetT = 0;
  private smoothT = 0;
  private raf = 0;
  private disposed = false;
  private paused = false;
  /** Mouse-look / pointer parallax — home + contact only. */
  private pointerLookEnabled = false;
  private readonly particleBlending: THREE.Blending;
  private readonly inkAlpha: number = 1;
  private readonly lightTheme: boolean;
  /** Every shader material driven by uTime (sculptures, aura, stars, dust, nebula, trail). */
  private readonly animatedMaterials: THREE.ShaderMaterial[] = [];
  private trail: { geometry: THREE.BufferGeometry; positions: Float32Array } | null = null;

  constructor(options: JourneySceneOptions) {
    const { canvas, quality, reducedMotion, spaceBg, fog, palette, stationCounts, onProgress } = options;
    const lightTheme = Boolean(options.lightTheme);
    const particleBlending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.palette = palette;
    this.particleBlending = particleBlending;
    stationBlending = particleBlending;
    inkAlpha = lightTheme ? 0.55 : 1;
    this.inkAlpha = inkAlpha;
    this.lightTheme = lightTheme;
    this.onProgress = onProgress;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.setClearColor(new THREE.Color(spaceBg), 1);

    this.scene.fog = new THREE.FogExp2(new THREE.Color(fog), 0.014);
    this.camera = new THREE.PerspectiveCamera(
      66,
      window.innerWidth / window.innerHeight,
      0.1,
      220,
    );

    this.textPoints = buildTextPoints(
      "BERAT",
      quality === "full" ? 7000 : 4200,
      palette,
      HERO_WORDMARK_HEIGHT,
      particleBlending,
      lightTheme,
    );
    this.textGroup.add(this.textPoints);
    this.textGroup.position.set(0, 0.4, 7);
    this.textGroup.renderOrder = 6;
    this.textPoints.renderOrder = 6;
    this.scene.add(this.textGroup);

    this.arrivalPoints = buildTextPoints("CONNECT", quality === "full" ? 6000 : 3600, palette, 5, particleBlending, lightTheme);
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = 1;
    this.arrivalGroup.add(this.arrivalPoints);
    this.arrivalGroup.position.set(0, 0.4, -142);
    this.arrivalGroup.visible = false;
    this.scene.add(this.arrivalGroup);
    this.fitWordmarks();

    this.stars = this.buildStarfield(quality === "full" ? 4800 : 2400);
    this.scene.add(this.stars);

    this.buildStations(stationCounts);
    if (quality === "full") {
      this.buildDriftField();
      this.buildNearMotes();
    }

    this.comet = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 12),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.accent),
        transparent: true,
        opacity: 0.95,
        blending: particleBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.comet);

    if (quality === "full") {
      // Camera must be part of the graph for its children (nebula) to render.
      this.scene.add(this.camera);

      // Domain-warped liquid / caustic wash (same class in both themes).
      const nebulaMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: lightTheme ? 0.4 : 0.22 },
          uInkMode: { value: lightTheme ? 1 : 0 },
          uTintA: {
            value: lightTheme
              ? new THREE.Color(palette.accent).lerp(new THREE.Color(0x142028), 0.72)
              : new THREE.Color(palette.accent).lerp(new THREE.Color(fog), 0.68),
          },
          uTintB: {
            value: lightTheme
              ? new THREE.Color(palette.cyan).lerp(new THREE.Color(0x1c2c38), 0.55)
              : new THREE.Color(palette.cyan).lerp(new THREE.Color(palette.emerald), 0.22),
          },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader:
          GLSL_NOISE_2D +
          `
          uniform float uTime;
          uniform float uIntensity;
          uniform float uInkMode;
          uniform vec3 uTintA;
          uniform vec3 uTintB;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv * vec2(3.4, 2.0);
            p += vec2(uTime * 0.014, -uTime * 0.009);
            vec2 q = p + 0.55 * vec2(fbm(p + uTime * 0.05), fbm(p.yx - uTime * 0.04));
            float n = fbm(q);
            float bands = abs(sin(q.x * 2.6 + n * 3.2 + uTime * 0.18));
            float caustic = pow(max(1.0 - bands, 0.0), 5.0);
            float wash = smoothstep(-0.2, 0.78, n);
            vec3 col = mix(uTintA, uTintB, clamp(wash * 0.7 + caustic * 0.5, 0.0, 1.0));
            float field = mix(wash, caustic, 0.42);
            float alpha = field * uIntensity * mix(1.0, 1.15, uInkMode);
            gl_FragColor = vec4(col, alpha);
          }
        `,
      });
      const nebula = new THREE.Mesh(new THREE.PlaneGeometry(560, 260), nebulaMat);
      nebula.position.set(0, 0, -170);
      nebula.renderOrder = -1;
      nebula.frustumCulled = false;
      this.camera.add(nebula);
      this.animatedMaterials.push(nebulaMat);

      const grainMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: lightTheme ? 0.14 : 0.12 },
          uTintA: {
            value: lightTheme
              ? new THREE.Color(0x1a2834).lerp(new THREE.Color(fog), 0.28)
              : new THREE.Color(palette.accent).lerp(new THREE.Color(fog), 0.82),
          },
          uTintB: {
            value: lightTheme
              ? new THREE.Color(palette.cyan).lerp(new THREE.Color(0x243040), 0.62)
              : new THREE.Color(palette.cyan).lerp(new THREE.Color(fog), 0.7),
          },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader:
          GLSL_NOISE_2D +
          `
          uniform float uTime;
          uniform float uIntensity;
          uniform vec3 uTintA;
          uniform vec3 uTintB;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv * vec2(9.0, 5.5);
            p += vec2(-uTime * 0.008, uTime * 0.004);
            float n = fbm(p * 1.4 + 0.35 * fbm(p * 3.1));
            float d = smoothstep(0.05, 0.92, n);
            vec3 col = mix(uTintA, uTintB, clamp(n, 0.0, 1.0));
            gl_FragColor = vec4(col, d * uIntensity);
          }
        `,
      });
      const grain = new THREE.Mesh(new THREE.PlaneGeometry(560, 260), grainMat);
      grain.position.set(0, 0, -168);
      grain.renderOrder = -2;
      grain.frustumCulled = false;
      this.camera.add(grain);
      this.animatedMaterials.push(grainMat);

      // Fading particle trail behind the comet (ring buffer, newest at index 0).
      const TRAIL_N = 28;
      const trailPos = new Float32Array(TRAIL_N * 3);
      const start = this.curve.getPointAt(0);
      for (let i = 0; i < TRAIL_N; i++) {
        trailPos[i * 3] = start.x;
        trailPos[i * 3 + 1] = start.y;
        trailPos[i * 3 + 2] = start.z;
      }
      const trailAge = new Float32Array(TRAIL_N);
      for (let i = 0; i < TRAIL_N; i++) trailAge[i] = i / (TRAIL_N - 1);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
      trailGeo.setAttribute("aAge", new THREE.BufferAttribute(trailAge, 1));
      const trailMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: particleBlending,
        uniforms: {
          uPixelScale: { value: window.innerHeight * 0.5 },
          uColor: { value: new THREE.Color(palette.accent) },
          uInk: { value: inkAlpha },
        },
        vertexShader: `
          attribute float aAge;
          uniform float uPixelScale;
          varying float vAge;
          void main() {
            vAge = aAge;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uPixelScale * mix(0.16, 0.04, aAge) / max(1.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uInk;
          varying float vAge;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float alpha = smoothstep(0.5, 0.1, d) * (1.0 - vAge) * 0.85 * uInk;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });
      const trailPoints = new THREE.Points(trailGeo, trailMat);
      trailPoints.frustumCulled = false;
      this.scene.add(trailPoints);
      this.trail = { geometry: trailGeo, positions: trailPos };
      this.animatedMaterials.push(trailMat);
    }

    // Bloom + additive glow only reads on dark clears; skip in light theme.
    if (quality === "full" && !lightTheme) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(
        new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.35,
          0.4,
          0.55,
        ),
      );
      this.composer.setSize(window.innerWidth, window.innerHeight);
    } else {
      this.composer = null;
    }

    if (!reducedMotion) {
      this.bindScroll();
      window.addEventListener("resize", this.handleResize);
      window.addEventListener("pointermove", this.handlePointerMove, {
        passive: true,
      });
    }

    this.renderOneFrame(0);
    this.publishProgress(this.smoothT);
    if (!reducedMotion) this.loop(performance.now());
  }
  private buildStarfield(count: number): THREE.Points {
    const { cyan, emerald, coral, accent } = this.palette;
    const fogCol = new THREE.Color(
      this.lightTheme ? 0x6a7686 : 0x0a1018,
    );
    const stops = this.lightTheme
      ? [
          new THREE.Color(accent).lerp(fogCol, 0.55),
          new THREE.Color(cyan).lerp(fogCol, 0.5),
          new THREE.Color(emerald).lerp(fogCol, 0.58),
          new THREE.Color(accent).lerp(new THREE.Color(0x1a2430), 0.35),
        ]
      : [
          new THREE.Color(cyan),
          new THREE.Color(emerald),
          new THREE.Color(coral),
          new THREE.Color(accent),
        ];
    const starPos = new Float32Array(count * 3);
    const starCol = new Float32Array(count * 3);
    const starSeed = new Float32Array(count);
    const shellCount = Math.floor(count * 0.35);
    const dir = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      if (i < shellCount) {
        dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
        dir.normalize();
        const radius = 80 + Math.random() * 60;
        starPos[i * 3] = dir.x * radius;
        starPos[i * 3 + 1] = dir.y * radius * 0.62;
        starPos[i * 3 + 2] = dir.z * radius - 40;
      } else {
        starPos[i * 3] = (Math.random() - 0.5) * 90;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 42;
        starPos[i * 3 + 2] = 20 - Math.random() * 140;
      }
      const c = stops[(Math.random() * stops.length) | 0];
      const dim = 0.35 + Math.random() * 0.65;
      starCol[i * 3] = c.r * dim;
      starCol[i * 3 + 1] = c.g * dim;
      starCol[i * 3 + 2] = c.b * dim;
      starSeed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(starCol, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(starSeed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: this.particleBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelScale: { value: window.innerHeight * 0.5 },
        uInk: { value: this.inkAlpha },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelScale;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vColor = aColor;
          vTw = 0.55 + 0.45 * sin(uTime * (0.5 + fract(aSeed * 3.7) * 1.3) + aSeed * 6.2831);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uPixelScale * (0.22 + 0.3 * fract(aSeed * 7.3)) * vTw / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uInk;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.1, d) * vTw * uInk;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });
    this.animatedMaterials.push(mat);
    return new THREE.Points(geo, mat);
  }

  /** One glowing wireframe station per chapter + orbiting "content dust" mirroring portfolio scale. */
  private buildStations(stationCounts: readonly number[]) {
    const tintColors = [
      new THREE.Color(this.palette.accent),
      new THREE.Color(this.palette.cyan),
      new THREE.Color(this.palette.emerald),
      new THREE.Color(this.palette.amber),
      new THREE.Color(this.palette.coral),
      new THREE.Color(this.palette.accent),
    ];

    const stationT = [0.18, 0.34, 0.5, 0.66, 0.82, 0.95];
    const stationScale = [2.6, 2.5, 2.2, 2.45, 2.3, 2.6];
    for (let i = 0; i < STATION_BUILDERS.length; i++) {
      const object = STATION_BUILDERS[i](tintColors[i]);
      this.parkOnPath(object, stationT[i], i % 2 ? 1 : -1, (i % 3 - 1) * 1.2, 3.2);
      object.scale.setScalar(stationScale[i]);
      this.stations.push(object);
      this.scene.add(object);

      // Wireframe pulse materials + soft fresnel aura shells per mesh.
      // Collect first — adding children mid-traverse would recurse forever.
      const meshes: THREE.Mesh[] = [];
      object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
      });
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.ShaderMaterial;
        if (mat?.uniforms?.uTime) this.animatedMaterials.push(mat);
        const aura = new THREE.Mesh(mesh.geometry, auraMaterial(tintColors[i]));
        aura.scale.setScalar(1.045);
        mesh.add(aura);
        this.animatedMaterials.push(aura.material as THREE.ShaderMaterial);
      }

      const count = Math.min(stationCounts[i] ?? 0, 60);
      if (count > 0) {
        this.orbitDust.push(
          this.buildOrbitDust(object.position, count, tintColors[i], 0.1 + i * 0.05),
        );
      }
    }
  }

  /** Park a sculpture on the camera-path Frenet frame so scale-up never clips the tube. */
  private parkOnPath(
    object: THREE.Object3D,
    t: number,
    side: number,
    lift: number,
    back: number,
  ) {
    const p = this.curve.getPointAt(t);
    const idx = Math.round(t * FRENET_SEGMENTS);
    const { binormals, normals, tangents } = this.frenet;
    object.position
      .copy(p)
      .addScaledVector(binormals[idx], side * 11)
      .addScaledVector(normals[idx], lift * 1.4)
      .addScaledVector(tangents[idx], back);
    object.lookAt(p);
  }

  /**
   * Mixed drift through the journey volume: tide rings, kelp needles,
   * crystal shards, seed pods. Never a tiled page of the same rectangle.
   */
  private buildDriftField() {
    const dummy = new THREE.Object3D();
    const look = new THREE.Vector3();
    const ink = new THREE.Color(this.palette.accent).lerp(
      new THREE.Color(this.palette.cyan),
      0.35,
    );
    const kinds: Array<{
      geo: THREE.BufferGeometry;
      count: number;
      scale: () => [number, number, number];
    }> = [
      {
        geo: new THREE.TorusGeometry(1.05, 0.032, 5, 20),
        count: 72,
        scale: () => {
          const s = 0.32 + Math.random() * 1.15;
          return [s, s * (0.35 + Math.random() * 0.7), s];
        },
      },
      {
        geo: new THREE.ConeGeometry(0.11, 2.35, 5, 1, true),
        count: 58,
        scale: () => {
          const s = 0.45 + Math.random() * 1.25;
          return [s * (0.55 + Math.random() * 0.6), s, s * (0.55 + Math.random() * 0.6)];
        },
      },
      {
        geo: new THREE.TetrahedronGeometry(0.82),
        count: 48,
        scale: () => {
          const s = 0.4 + Math.random() * 0.95;
          return [s, s * (0.7 + Math.random() * 0.8), s * (0.55 + Math.random() * 0.7)];
        },
      },
      {
        geo: new THREE.OctahedronGeometry(0.52, 0),
        count: 42,
        scale: () => {
          const s = 0.35 + Math.random() * 0.85;
          return [s, s, s];
        },
      },
    ];

    for (const kind of kinds) {
      const mat = new THREE.ShaderMaterial({
        wireframe: true,
        transparent: true,
        depthWrite: false,
        blending: this.particleBlending,
        defines: { USE_INSTANCING: "" },
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: (this.lightTheme ? 0.34 : 0.36) * this.inkAlpha },
          uColor: { value: ink.clone() },
        },
        vertexShader: `
          varying float vZ;
          void main() {
            vec3 transformed = position;
            #ifdef USE_INSTANCING
              transformed = (instanceMatrix * vec4(transformed, 1.0)).xyz;
            #endif
            vZ = transformed.z;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uTime;
          varying float vZ;
          void main() {
            float pulse = 0.82 + 0.18 * sin(uTime * 0.35 + vZ * 0.07);
            gl_FragColor = vec4(uColor, uOpacity * pulse);
          }
        `,
      });
      const mesh = new THREE.InstancedMesh(kind.geo, mat, kind.count);
      for (let i = 0; i < kind.count; i++) {
        dummy.position.set(
          (Math.random() - 0.5) * 52,
          (Math.random() - 0.5) * 28,
          22 - Math.random() * 160,
        );
        const t = THREE.MathUtils.clamp((22 - dummy.position.z) / 160, 0, 1);
        this.curve.getPointAt(t, look);
        dummy.lookAt(look);
        dummy.rotateX((Math.random() - 0.5) * 1.6);
        dummy.rotateZ((Math.random() - 0.5) * 2.1);
        dummy.scale.set(...kind.scale());
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.animatedMaterials.push(mat);
    }
  }

  /** Soft motes filling the journey AABB, not a cylinder around the camera path. */
  private buildNearMotes() {
    const count = 1200;
    const centers = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const radii = new Float32Array(count);
    const heights = new Float32Array(count);
    const seeds = new Float32Array(count);
    const ink = this.lightTheme
      ? new THREE.Color(this.palette.accent).lerp(new THREE.Color(0x1a2430), 0.28)
      : new THREE.Color(this.palette.cyan);
    for (let i = 0; i < count; i++) {
      centers[i * 3] = (Math.random() - 0.5) * 50;
      centers[i * 3 + 1] = (Math.random() - 0.5) * 28;
      centers[i * 3 + 2] = 22 - Math.random() * 160;
      const dim = 0.45 + Math.random() * 0.55;
      colors[i * 3] = ink.r * dim;
      colors[i * 3 + 1] = ink.g * dim;
      colors[i * 3 + 2] = ink.b * dim;
      angles[i] = Math.random() * Math.PI * 2;
      radii[i] = 0.6 + Math.random() * 3.4;
      heights[i] = (Math.random() - 0.5) * 2.4;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aCenter", new THREE.BufferAttribute(centers, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aAngle", new THREE.BufferAttribute(angles, 1));
    geo.setAttribute("aRadius", new THREE.BufferAttribute(radii, 1));
    geo.setAttribute("aHeight", new THREE.BufferAttribute(heights, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: this.particleBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelScale: { value: window.innerHeight * 0.5 },
        uInk: { value: this.inkAlpha * (this.lightTheme ? 0.7 : 1) },
      },
      vertexShader: `
        attribute vec3 aCenter;
        attribute vec3 aColor;
        attribute float aAngle;
        attribute float aRadius;
        attribute float aHeight;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelScale;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          float ang = aAngle + uTime * 0.12 * (0.5 + fract(aSeed * 4.2));
          vec3 p = aCenter + vec3(cos(ang) * aRadius, aHeight, sin(ang) * aRadius * 0.55);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uPixelScale * 0.16 / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uInk;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.12, d) * 0.85 * uInk;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });
    this.animatedMaterials.push(mat);
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.scene.add(points);
  }

  /** Per-particle orbital motion computed in the vertex shader — round soft sprites. */
  private buildOrbitDust(
    center: THREE.Vector3,
    count: number,
    tint: THREE.Color,
    speed: number,
  ): THREE.Points {
    const colors = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const radii = new Float32Array(count);
    const heights = new Float32Array(count);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      angles[i] = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      radii[i] = 5.4 + Math.random() * 2.2;
      heights[i] = (Math.random() - 0.5) * 2.2;
      const dim = 0.5 + Math.random() * 0.5;
      colors[i * 3] = tint.r * dim;
      colors[i * 3 + 1] = tint.g * dim;
      colors[i * 3 + 2] = tint.b * dim;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aAngle", new THREE.BufferAttribute(angles, 1));
    geo.setAttribute("aRadius", new THREE.BufferAttribute(radii, 1));
    geo.setAttribute("aHeight", new THREE.BufferAttribute(heights, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: this.particleBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelScale: { value: window.innerHeight * 0.5 },
        uCenter: { value: center.clone() },
        uSpeed: { value: speed },
        uInk: { value: this.inkAlpha },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aAngle;
        attribute float aRadius;
        attribute float aHeight;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelScale;
        uniform vec3 uCenter;
        uniform float uSpeed;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          float ang = aAngle + uTime * uSpeed * (0.6 + 0.8 * fract(aSeed * 5.1));
          vec3 p = uCenter + vec3(cos(ang) * aRadius, aHeight, sin(ang) * aRadius * 0.6);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uPixelScale * 0.2 / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uInk;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.12, d) * 0.9 * uInk;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });
    this.animatedMaterials.push(mat);
    const points = new THREE.Points(geo, mat);
    // Real positions live in attributes, not `position` — never cull.
    points.frustumCulled = false;
    this.scene.add(points);
    return points;
  }
  /**
   * The wordmarks are built at a fixed world width, so a portrait frustum
   * clips them at both ends. Scale them back to the visible width instead.
   */
  private fitWordmarks() {
    const aspect = window.innerWidth / window.innerHeight;
    const scale = Math.min(1, aspect / LANDSCAPE_FIT_ASPECT);
    this.textGroup.scale.setScalar(scale * HERO_WORDMARK_FIT);
    this.arrivalGroup.scale.setScalar(scale);
    // Portrait stacks the hero copy tall, so lift the glyph clear of it.
    const lift = (1 - scale) * PORTRAIT_WORDMARK_LIFT;
    this.textGroup.position.y = 0.4 + lift;
    this.arrivalGroup.position.y = 0.4 + lift;
  }

  private readonly handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
    this.fitWordmarks();
    const pixelScale = window.innerHeight * 0.5;
    for (const mat of this.animatedMaterials) {
      if (mat.uniforms.uPixelScale) mat.uniforms.uPixelScale.value = pixelScale;
    }
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    this.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    this.pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
  };

  private readonly handleScroll = () => {
    this.targetT = mapScrollToJourneyT();
  };

  private bindScroll() {
    this.handleScroll();
    window.addEventListener("scroll", this.handleScroll, { passive: true });
  }

  /** Damped scroll progress, clamped short of a hard path finish. */
  private journeyT(): number {
    const t = this.reducedMotion ? 0 : this.smoothT;
    return Number.isFinite(t) ? THREE.MathUtils.clamp(t, 0, PATH_END_T) : 0;
  }

  private nearestStation(t: number): THREE.Object3D | undefined {
    if (this.stations.length === 0) return undefined;
    const stationT = [0.18, 0.34, 0.5, 0.66, 0.82, 0.95];
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.stations.length; i++) {
      const dist = Math.abs((stationT[i] ?? 1) - t);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return this.stations[best];
  }

  private publishProgress(t: number) {
    const value = Number.isFinite(t) ? t : 0;
    this.renderer.domElement.dataset.journeyT = value.toFixed(4);
    this.onProgress?.(value);
  }

  private renderOneFrame(time: number) {
    // `time` is elapsed seconds.
    const t = Math.max(0, time);
    const scatter = this.reducedMotion ? 0 : THREE.MathUtils.smoothstep(this.smoothT, 0.02, 0.16);
    (this.textPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = scatter;
    (this.textPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    this.textGroup.rotation.y = Math.sin(t * 0.15) * 0.06;

    // Gather CONNECT through Contact but leave residual scatter so the
    // path never looks finished / parked at the footer.
    const arrive = this.reducedMotion
      ? 1
      : 1 - 0.62 * THREE.MathUtils.smoothstep(this.smoothT, 0.84, PATH_END_T);
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = arrive;
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    this.arrivalGroup.rotation.y = Math.sin(t * 0.12 + 2) * 0.05;
    this.arrivalGroup.visible = !this.reducedMotion && this.smoothT > 0.8;

    if (!this.reducedMotion) {
      this.stars.rotation.y = t * 0.008;
      this.stations.forEach((mesh, i) => {
        if (mesh.userData.baseY === undefined) mesh.userData.baseY = mesh.position.y;
        if (mesh.userData.baseQuat === undefined) {
          mesh.userData.baseQuat = mesh.quaternion.clone();
        }
        const spin = (mesh.userData.spin ?? { y: 0.12, x: 0, bob: 0.12 }) as StationSpin;
        mesh.position.y =
          mesh.userData.baseY + Math.sin(t * 0.55 + i * 1.7) * spin.bob;
        mesh.quaternion.copy(mesh.userData.baseQuat);
        mesh.rotateY(Math.sin(t * 0.2 + i * 0.9) * spin.y);
        if (spin.x) mesh.rotateX(Math.sin(t * 0.14 + i * 0.6) * spin.x);
        const presence =
          0.18 + 0.82 * THREE.MathUtils.smoothstep(this.smoothT, 0.05, 0.22);
        mesh.traverse((child) => {
          const mat = (child as THREE.Mesh).material as
            | THREE.ShaderMaterial
            | undefined;
          if (!mat?.uniforms?.uOpacity) return;
          const base = mat.wireframe ? 0.82 : 0.34;
          mat.uniforms.uOpacity.value = base * this.inkAlpha * presence;
        });
      });
      // Orbit dust animates per-particle in its own vertex shader.
      const cometT = ((t / 26) % 1 + 1) % 1;
      this.comet.position.copy(this.curve.getPointAt(cometT));
      this.comet.scale.setScalar(1 + Math.sin(t * 4) * 0.3);
      if (this.trail) {
        const { geometry, positions } = this.trail;
        const n = positions.length / 3;
        for (let i = n - 1; i > 0; i--) {
          positions[i * 3] = positions[(i - 1) * 3];
          positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
          positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
        }
        positions[0] = this.comet.position.x;
        positions[1] = this.comet.position.y;
        positions[2] = this.comet.position.z;
        (geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // Drive every uTime-based material (sculpture pulse, aura, stars, dust, nebula).
    for (const mat of this.animatedMaterials) {
      if (mat.uniforms.uTime) mat.uniforms.uTime.value = t;
    }

    const pathT = this.journeyT();
    const pos = this.curve.getPointAt(pathT);
    this.camera.position.copy(pos);
    this.curve.getTangentAt(pathT, this.tangent);
    const station = this.nearestStation(pathT);
    const look = resolveJourneyLookTarget({
      t: pathT,
      cameraPos: pos,
      tangent: this.tangent,
      textPos: this.textGroup.position,
      arrivalPos: this.arrivalGroup.position,
      stationPos: station?.position,
    });
    this.lookTarget.set(look.x, look.y, look.z);
    if (!this.reducedMotion) {
      const linger = THREE.MathUtils.smoothstep(this.smoothT, 0.82, PATH_END_T);
      this.lookTarget.x += Math.sin(t * 0.31) * 0.18 * linger;
      this.lookTarget.y += Math.cos(t * 0.24) * 0.1 * linger;
      if (this.pointerLookEnabled) {
        this.lookTarget.x += this.pointer.x * 0.32;
        this.lookTarget.y += this.pointer.y * 0.2;
      }
    }
    this.camera.lookAt(this.lookTarget);
    this.renderer.domElement.dataset.journeyLook = journeyLookName({
      look: this.lookTarget,
      textPos: this.textGroup.position,
      arrivalPos: this.arrivalGroup.position,
    });

    this.composer?.render();
    if (!this.composer) this.renderer.render(this.scene, this.camera);
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    if (this.paused) {
      this.raf = 0;
      return;
    }
    this.timer.update(now);
    const rawDt = this.timer.getDelta();
    const dt = Number.isFinite(rawDt) && rawDt > 0 ? Math.min(rawDt, 0.05) : 1 / 60;
    const t = Math.max(0, this.timer.getElapsed());
    this.smoothT += (this.targetT - this.smoothT) * (1 - Math.exp(-3.2 * dt));
    if (!Number.isFinite(this.smoothT)) this.smoothT = this.targetT;
    this.renderOneFrame(t);
    this.publishProgress(this.smoothT);
    this.raf = requestAnimationFrame(this.loop);
  };

  resize() {
    this.handleResize();
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    if (!this.disposed && this.raf === 0) {
      // Refresh the timer so resume does not ingest a huge delta.
      this.timer.update(performance.now());
      this.loop(performance.now());
    }
  }

  /** Enable mouse-moves-camera only on #home and Contact; mid-stations are scroll-driven. */
  setPointerLookEnabled(enabled: boolean) {
    if (this.pointerLookEnabled === enabled) return;
    this.pointerLookEnabled = enabled;
    if (!enabled) {
      this.pointer.x = 0;
      this.pointer.y = 0;
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointerMove);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.renderer.dispose();
  }
}