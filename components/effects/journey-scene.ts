import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

import {
  createProceduralAscii,
  updateProceduralAscii,
} from "./procedural-ascii";
import {
  createAsciiPerson,
  updateAsciiPerson,
  poseForProgress,
  type PersonPose,
} from "./ascii-person";

import type { JourneyPropManifest } from "@/data/journey-props";

import {
  PATH_END_T,
  SECTION_PATH_T,
  STATION_PATH_T,
  interpolateStationPosition,
  journeyLookName,
  mapSectionScrollToJourneyT,
  resolveJourneyLookTarget,
} from "./journey-camera";
import {
  buildJourneyContentProps,
  disposeContentProp,
  propPresence,
  type ContentPropHandle,
} from "./journey-props";

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
  /** Paper/project previews + floating tech type for content-aware mid-path props. */
  readonly props?: JourneyPropManifest;
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
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
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
        new THREE.Color(0xffffff).lerp(new THREE.Color(palette.accent), 0.28),
        new THREE.Color(0xffffff).lerp(new THREE.Color(palette.cyan), 0.35),
      ];
  for (let i = 0; i < count; i++) {
    const [px, py] = candidates[(Math.random() * candidates.length) | 0] ?? [
      c.width / 2,
      c.height / 2,
    ];
    positions[i * 3] = (px / c.width - 0.5) * worldW + (Math.random() - 0.5) * 0.03;
    positions[i * 3 + 1] = -(py / c.height - 0.5) * worldH + (Math.random() - 0.5) * 0.03;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.42;
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
    depthTest: false,
    fog: false,
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
        vColor = color${ink ? "" : " * 1.06"};
        vec3 p = position;
        vec3 dir = normalize(vec3(sin(seed * 3.1), cos(seed * 2.3), sin(seed * 5.7)));
        p += dir * uScatter * (9.0 + seed * 2.0);
        p.y += sin(uTime * 0.8 + seed) * 0.05;
        p.x += cos(uTime * 0.6 + seed * 1.7) * 0.04;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = max(-mv.z, 0.35);
        gl_PointSize = min((1.15 + 1.05 * fract(seed)) * (${ink ? "58.0" : "78.0"} / dist), ${ink ? "8.0" : "11.0"});
        vFade = smoothstep(80.0, 16.0, dist) * smoothstep(0.45, 2.8, dist);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.08, d) * vFade${ink ? "" : " * 1.08"};
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

/**
 * Story chapters — one visual metaphor per portfolio section:
 *   0 About        — "The Current": river of milestones, amber human moments
 *   1 Publications — "Binary Star": fracturing SkillOptimizer + @GrokSet nebula
 *   2 Experience   — "Monolith Valley": four architectural role monoliths
 *   3 Projects     — "The Shipyard": wireframe hulls carrying people (amber)
 *   4 Skills       — "The Orrery": orbital skill system around a core
 *   5 Contact      — "The Beacon": lighthouse spire broadcasting outward
 */
const STATION_BUILDERS: ((
  color: THREE.Color,
  palette: JourneyPalette,
) => THREE.Object3D)[] = [
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
const HERO_WORDMARK_FIT = 0.864;
/** Additional phone-only shrink on top of the shared fit. */
const PHONE_HERO_WORDMARK_FIT = 0.9;
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

/**
 * Story chapters — one visual metaphor per portfolio section, sharing one art
 * direction (wireframe + emissive + additive points, cyan tech / amber human).
 * Each builder receives the chapter tint and the full palette for accents.
 */

function amberColor(palette: JourneyPalette): THREE.Color {
  return new THREE.Color(palette.amber);
}

/** Soft round sprite texture for point clouds (shared). */
let softDotTexture: THREE.Texture | null = null;
function getSoftDotTexture(): THREE.Texture {
  if (softDotTexture) return softDotTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  softDotTexture = new THREE.CanvasTexture(c);
  return softDotTexture;
}

/** Small glowing points that skip the aura-shell treatment (perf). */
function glowPoints(
  positions: Float32Array,
  color: THREE.Color,
  size: number,
  opacity = 0.9,
): THREE.Points {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    map: getSoftDotTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.userData.noAura = true;
  return points;
}

/** Tiny emissive sphere that skips the aura shell (perf). */
function ember(
  color: THREE.Color,
  radius: number,
  position: readonly [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  mesh.position.set(...position);
  mesh.userData.noAura = true;
  return mesh;
}

/**
 * Chapter 1 — ABOUT · "The Current"
 * His life as a luminous river: a winding tube-ribbon with six milestone orbs
 * in story order. Human moments (Discord bot, Vitae) glow amber; the rest cyan.
 */
function buildEducationMark(color: THREE.Color, palette: JourneyPalette): THREE.Object3D {
  const group = new THREE.Group();
  const amber = amberColor(palette);
  // Winding river.
  const river = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.6, -0.7, 0.3),
    new THREE.Vector3(-1.5, 0.1, -0.4),
    new THREE.Vector3(-0.4, 0.75, 0.25),
    new THREE.Vector3(0.8, 0.15, -0.35),
    new THREE.Vector3(1.9, -0.5, 0.2),
    new THREE.Vector3(2.8, 0.35, -0.15),
  ]);
  group.add(stationMesh(new THREE.TubeGeometry(river, 64, 0.07, 8, false), color));
  // Six milestone orbs along the river: first code, hackathon, discord (amber),
  // trustd, algoverse, vitae (amber).
  const milestones: Array<{ t: number; human: boolean; s: number }> = [
    { t: 0.04, human: false, s: 0.16 },
    { t: 0.22, human: false, s: 0.14 },
    { t: 0.4, human: true, s: 0.2 },
    { t: 0.58, human: false, s: 0.17 },
    { t: 0.76, human: false, s: 0.18 },
    { t: 0.94, human: true, s: 0.22 },
  ];
  for (const m of milestones) {
    const p = river.getPointAt(m.t);
    const orb = stationMesh(
      new THREE.IcosahedronGeometry(m.s, 1),
      m.human ? amber : color,
      [p.x, p.y + 0.42, p.z],
    );
    group.add(orb);
    // Tributary stream feeding the milestone.
    const trib = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(p.x - 0.7, p.y - 1.1, p.z + 0.5),
      new THREE.Vector3(p.x - 0.3, p.y - 0.4, p.z + 0.2),
      new THREE.Vector3(p.x, p.y + 0.28, p.z),
    );
    group.add(
      stationMesh(
        new THREE.TubeGeometry(trib, 16, 0.022, 5, false),
        m.human ? amber : color,
      ),
    );
  }
  return withSpin(group, { y: 0.1, x: 0.04, bob: 0.14 });
}

/**
 * Chapter 2 — PUBLICATIONS · "Binary Star"
 * Two papers as a binary system. SkillOptimizer: an icosahedron fracturing
 * into orbiting sub-polyhedra (performing the paper's claim). @GrokSet:
 * a 1M-conversation nebula. A citation beam with traveling pulses links them.
 */
function buildTwoPapers(color: THREE.Color, palette: JourneyPalette): THREE.Object3D {
  const group = new THREE.Group();
  const amber = amberColor(palette);
  // Star A — SkillOptimizer: core + fracturing sub-skills in orbit.
  const coreA = new THREE.Group();
  coreA.position.set(-1.15, 0.15, 0);
  coreA.add(stationMesh(new THREE.IcosahedronGeometry(0.5, 0), color));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    coreA.add(
      stationMesh(new THREE.OctahedronGeometry(0.13, 0), color, [
        Math.cos(a) * 0.95,
        Math.sin(a * 1.3) * 0.35,
        Math.sin(a) * 0.95,
      ]),
    );
  }
  coreA.add(
    stationMesh(new THREE.TorusGeometry(1.0, 0.028, 6, 48), color, [0, 0, 0], [
      Math.PI / 2.4,
      0.2,
      0,
    ]),
  );
  group.add(coreA);
  // Star B — @GrokSet nebula: conversation galaxy.
  const nebCount = 500;
  const nebPos = new Float32Array(nebCount * 3);
  for (let i = 0; i < nebCount; i++) {
    const r = 0.55 + Math.random() * 0.75;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    nebPos[i * 3] = 1.25 + r * Math.sin(ph) * Math.cos(th);
    nebPos[i * 3 + 1] = 0.1 + r * Math.sin(ph) * Math.sin(th) * 0.7;
    nebPos[i * 3 + 2] = r * Math.cos(ph) * 0.8;
  }
  group.add(glowPoints(nebPos, amber, 0.09, 0.85));
  group.add(
    stationMesh(new THREE.IcosahedronGeometry(0.3, 1), amber, [1.25, 0.1, 0]),
  );
  // Citation beam with traveling pulses.
  const beam = new THREE.LineCurve3(
    new THREE.Vector3(-0.65, 0.15, 0),
    new THREE.Vector3(0.85, 0.12, 0),
  );
  group.add(stationMesh(new THREE.TubeGeometry(beam, 12, 0.025, 5, false), color));
  for (let i = 0; i < 3; i++) {
    const pulse = ember(color, 0.07, [-0.65 + i * 0.5, 0.15, 0]);
    pulse.userData.pulseOffset = i / 3;
    group.add(pulse);
  }
  group.userData.pulses = true;
  return withSpin(group, { y: 0.14, x: 0.05, bob: 0.1 });
}

/**
 * Chapter 3 — EXPERIENCE · "Monolith Valley"
 * Four architectural monoliths, one per role, on a lit career path.
 * Trustd.ai: crystal tower in a test-grid cage. Algoverse: geodesic dome.
 * UCSC tutor: inverted amphitheater rings. Stealth: dark engine block.
 */
function buildRoleBadges(color: THREE.Color, palette: JourneyPalette): THREE.Object3D {
  const group = new THREE.Group();
  const amber = amberColor(palette);
  // Career path lighting the valley floor.
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.6, -1.05, 0.4),
    new THREE.Vector3(-0.9, -1.0, -0.2),
    new THREE.Vector3(0.9, -1.05, 0.25),
    new THREE.Vector3(2.6, -1.0, -0.3),
  ]);
  group.add(stationMesh(new THREE.TubeGeometry(path, 40, 0.035, 6, false), color));
  // 1 — Trustd.ai crystal tower in a test-grid cage.
  const m1 = new THREE.Group();
  m1.position.set(-1.95, 0, 0.2);
  m1.add(stationMesh(new THREE.CylinderGeometry(0.22, 0.34, 1.5, 6), color, [0, 0.1, 0]));
  m1.add(
    stationMesh(new THREE.BoxGeometry(1.0, 1.9, 1.0), color, [0, 0.1, 0]),
  );
  group.add(m1);
  // 2 — Algoverse geodesic dome.
  const m2 = new THREE.Group();
  m2.position.set(-0.65, -0.15, -0.1);
  const dome = stationMesh(new THREE.SphereGeometry(0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), color, [0, -0.2, 0]);
  group.add(m2);
  m2.add(dome);
  // 3 — UCSC tutor amphitheater: three ascending rings (students rising).
  const m3 = new THREE.Group();
  m3.position.set(0.75, 0, 0.15);
  for (let i = 0; i < 3; i++) {
    m3.add(
      stationMesh(
        new THREE.TorusGeometry(0.55 - i * 0.14, 0.03, 6, 36),
        amber,
        [0, -0.25 + i * 0.42, 0],
        [Math.PI / 2, 0, 0],
      ),
    );
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    m3.add(ember(amber, 0.05, [Math.cos(a) * 0.4, 0.35 + (i % 3) * 0.3, Math.sin(a) * 0.4]));
  }
  group.add(m3);
  // 4 — Stealth engine block with four agent cores in a repair loop.
  const m4 = new THREE.Group();
  m4.position.set(2.0, -0.1, -0.15);
  m4.add(stationMesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), color, [0, 0.1, 0]));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    m4.add(ember(color, 0.08, [Math.cos(a) * 0.55, 0.1 + Math.sin(a * 2) * 0.2, Math.sin(a) * 0.55]));
  }
  group.add(m4);
  return withSpin(group, { y: 0.08, x: 0.03, bob: 0.1 });
}

/**
 * Chapter 4 — PROJECTS · "The Shipyard"
 * Software as vessels carrying people: two scaffolded wireframe hulls
 * (Vitae larger), amber crew lights roaming the hull, passenger dots inside
 * the chatbot hull — the warmest chapter.
 */
function buildShippedWork(color: THREE.Color, palette: JourneyPalette): THREE.Object3D {
  const group = new THREE.Group();
  const amber = amberColor(palette);
  // Vitae hull — large, sleek.
  const vitae = new THREE.Group();
  vitae.position.set(-1.0, 0.1, 0);
  const hullGeo = new THREE.CylinderGeometry(0.32, 0.55, 2.4, 8, 3, true);
  vitae.add(stationMesh(hullGeo, color, [0, 0, 0], [0, 0, Math.PI / 2]));
  // Scaffold ribs.
  for (let i = -1; i <= 1; i++) {
    vitae.add(
      stationMesh(new THREE.TorusGeometry(0.5, 0.025, 6, 24), color, [i * 0.8, 0, 0], [0, Math.PI / 2, 0]),
    );
  }
  // Five amber crew lights roaming the hull.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    vitae.add(ember(amber, 0.07, [Math.cos(a) * 1.0, Math.sin(a * 1.7) * 0.4, Math.sin(a) * 0.5]));
  }
  group.add(vitae);
  // Chatbot hull — smaller, full of passengers.
  const bot = new THREE.Group();
  bot.position.set(1.35, -0.15, 0.25);
  bot.add(stationMesh(new THREE.CylinderGeometry(0.28, 0.42, 1.7, 8, 2, true), amber, [0, 0, 0], [0, 0, Math.PI / 2]));
  const passCount = 46;
  const passPos = new Float32Array(passCount * 3);
  for (let i = 0; i < passCount; i++) {
    passPos[i * 3] = (Math.random() - 0.5) * 1.4;
    passPos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    passPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  bot.add(glowPoints(passPos, amber, 0.08, 0.9));
  group.add(bot);
  // Welding sparks between hulls.
  const sparkCount = 40;
  const sparkPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    sparkPos[i * 3] = 0.15 + (Math.random() - 0.5) * 0.5;
    sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
    sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
  }
  group.add(glowPoints(sparkPos, color, 0.06, 0.8));
  return withSpin(group, { y: 0.12, x: 0.04, bob: 0.12 });
}

/**
 * Chapter 5 — SKILLS · "The Orrery"
 * A mechanical solar system: central dodecahedron core, four tilted rings
 * (foundations → systems → full-stack → AI/agents), glowing skill nodes.
 */
function buildSkillRack(color: THREE.Color, palette: JourneyPalette): THREE.Object3D {
  const group = new THREE.Group();
  const amber = amberColor(palette);
  group.add(stationMesh(new THREE.DodecahedronGeometry(0.42, 0), amber, [0, 0, 0]));
  const rings: Array<{ r: number; tilt: readonly [number, number, number]; n: number }> = [
    { r: 0.85, tilt: [Math.PI / 2.15, 0.1, 0], n: 6 },
    { r: 1.25, tilt: [Math.PI / 1.85, -0.15, 0.2], n: 8 },
    { r: 1.65, tilt: [Math.PI / 2.35, 0.25, -0.15], n: 9 },
    { r: 2.05, tilt: [Math.PI / 2.0, -0.3, 0.1], n: 7 },
  ];
  const nodeGeos = [
    new THREE.OctahedronGeometry(0.09, 0),
    new THREE.TetrahedronGeometry(0.1),
    new THREE.IcosahedronGeometry(0.08, 0),
  ];
  rings.forEach((ring, ri) => {
    group.add(
      stationMesh(new THREE.TorusGeometry(ring.r, 0.022, 6, 64), color, [0, 0, 0], ring.tilt),
    );
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + ri * 0.5;
      // Place on the tilted ring: rotate the flat-circle point by the tilt.
      const v = new THREE.Vector3(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r);
      const e = new THREE.Euler(...ring.tilt);
      v.applyEuler(e);
      const nodeColor = ri === 3 ? amber : ri === 0 ? color.clone().multiplyScalar(0.75) : color;
      const node = stationMesh(nodeGeos[(i + ri) % 3], nodeColor, [v.x, v.y, v.z]);
      node.userData.noAura = true;
      group.add(node);
    }
  });
  return withSpin(group, { y: 0.18, x: 0.06, bob: 0.08 });
}

/**
 * Chapter 6 — CONTACT · "The Beacon"
 * A lighthouse spire broadcasting to the viewer: stacked rings, expanding
 * signal rings, amber warmth — the warmest frame of the journey.
 */
function buildEnvelope(color: THREE.Color, palette: JourneyPalette): THREE.Object3D {
  const group = new THREE.Group();
  const amber = amberColor(palette);
  // Tapered spire of stacked rings.
  for (let i = 0; i < 6; i++) {
    const r = 0.55 - i * 0.07;
    group.add(
      stationMesh(new THREE.TorusGeometry(r, 0.035, 8, 40), amber, [0, -0.9 + i * 0.42, 0], [
        Math.PI / 2,
        0,
        0,
      ]),
    );
  }
  // Beacon core.
  group.add(stationMesh(new THREE.OctahedronGeometry(0.3, 0), amber, [0, 1.85, 0]));
  // Expanding signal rings.
  for (let i = 0; i < 3; i++) {
    const ring = stationMesh(
      new THREE.TorusGeometry(0.9 + i * 0.55, 0.03, 6, 48),
      i === 1 ? color : amber,
      [0, 1.85, 0],
      [Math.PI / 2.2, 0.15 * i, 0],
    );
    ring.userData.signalRing = i;
    group.add(ring);
  }
  // Volumetric beam upward.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.3, 6, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: amber,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  beam.position.set(0, 4.4, 0);
  beam.userData.noAura = true;
  group.add(beam);
  return withSpin(group, { y: 0.1, x: 0.04, bob: 0.12 });
}

export class JourneyScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly quality: JourneyQuality;
  /** Narrow phone layout — visualViewport sizing + desktop nebula wash. */
  private readonly phoneLayout: boolean;
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
  private readonly contentProps: ContentPropHandle[] = [];
  private readonly textGroup = new THREE.Group();
  private readonly arrivalGroup = new THREE.Group();
  private readonly textPoints: THREE.Points;
  private readonly arrivalPoints: THREE.Points;
  private readonly comet: THREE.Mesh;
  private heroSpark: THREE.Mesh | null = null;
  private readonly heroRings: THREE.Mesh[] = [];
  private readonly chapterGates: THREE.Mesh[] = [];
  private readonly floatingIslands: THREE.Group[] = [];
  private fogCool: THREE.Color | null = null;
  private fogWarm: THREE.Color | null = null;
  private useAscii = false;
  private proceduralAsciiMat: THREE.ShaderMaterial | null = null;
  private proceduralBgScene: THREE.Scene | null = null;
  private proceduralBgCamera: THREE.OrthographicCamera | null = null;
  private useProcedural = true; // Pure procedural ASCII, not 3D conversion.
  private asciiPerson: THREE.Points | null = null;
  private currentPose: PersonPose | null = null;
  private readonly stars: THREE.Points;

  private readonly tangent = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3(0, 0, 0);
  private readonly lookSmoothed = new THREE.Vector3(0, 0, 0);
  private readonly arrivalPark = new THREE.Vector3(0, 0.4, -114);
  private lookPrimed = false;
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
    const {
      canvas,
      quality,
      reducedMotion,
      spaceBg,
      fog,
      palette,
      stationCounts,
      props,
      onProgress,
    } = options;
    const lightTheme = Boolean(options.lightTheme);
    const particleBlending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.quality = quality;
    this.phoneLayout =
      quality === "mobile" && window.matchMedia("(max-width: 767px)").matches;
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
      antialias: !this.phoneLayout,
      powerPreference: this.phoneLayout ? "low-power" : "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.phoneLayout ? 1.25 : 1.75),
    );
    const width = this.phoneLayout ? this.viewSize().w : window.innerWidth;
    const height = this.phoneLayout ? this.viewSize().h : window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(new THREE.Color(spaceBg), 1);
    this.renderer.domElement.dataset.journeyTheme = lightTheme ? "light" : "dark";

    // Dense fog constrains the background: each frame shows a complete
    // environment, not the entire journey stretching into the distance.
    this.scene.fog = new THREE.FogExp2(new THREE.Color(fog), 0.024);
    this.camera = new THREE.PerspectiveCamera(
      66,
      width / height,
      0.1,
      220,
    );

    this.textPoints = buildTextPoints(
      "BERAT",
      quality === "full" ? 10000 : 5600,
      palette,
      HERO_WORDMARK_HEIGHT,
      particleBlending,
      lightTheme,
    );
    this.textGroup.add(this.textPoints);
    this.textGroup.position.set(0, 0.4, 7);
    this.textGroup.renderOrder = 8;
    this.textPoints.renderOrder = 8;
    this.scene.add(this.textGroup);

    // Chapter 0 — HERO · "First Compile": a spark of curiosity igniting above
    // the wordmark, with expanding compile-ring shockwaves.
    const sparkGroup = new THREE.Group();
    const sparkColor = new THREE.Color(palette.accent);
    const spark = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      new THREE.MeshBasicMaterial({
        color: sparkColor,
        transparent: true,
        opacity: 0.95,
        blending: particleBlending,
        depthWrite: false,
      }),
    );
    spark.userData.noAura = true;
    sparkGroup.add(spark);
    this.heroSpark = spark;
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.35 + i * 0.22, 0.016, 6, 48),
        new THREE.MeshBasicMaterial({
          color: sparkColor,
          transparent: true,
          opacity: 0.5 - i * 0.12,
          blending: particleBlending,
          depthWrite: false,
        }),
      );
      ring.userData.noAura = true;
      ring.userData.compileRing = i;
      sparkGroup.add(ring);
      this.heroRings.push(ring);
    }
    sparkGroup.position.set(0, 3.1, 7);
    this.scene.add(sparkGroup);

    this.arrivalPoints = buildTextPoints(
      "LET'S CONNECT",
      quality === "full" ? 11000 : 6200,
      palette,
      6.6,
      particleBlending,
      lightTheme,
    );
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = 1;
    this.arrivalGroup.add(this.arrivalPoints);
    this.parkArrivalWordmark();
    this.arrivalGroup.visible = false;
    this.arrivalGroup.renderOrder = 8;
    this.arrivalPoints.renderOrder = 8;
    this.scene.add(this.arrivalGroup);
    this.fitWordmarks();

    this.stars = this.buildStarfield(quality === "full" ? 4800 : 2400);
    this.scene.add(this.stars);

    this.buildStations(stationCounts, Boolean(props));
    this.buildChapterGates();
    this.buildContinuousWorld();
    this.buildCosmos();
    // Emotional color arc: fog starts cool (cyan tech) and warms toward amber
    // (human moments) as the journey progresses.
    this.fogCool = new THREE.Color(fog);
    this.fogWarm = new THREE.Color(fog).lerp(new THREE.Color(palette.amber), 0.35);
    if (quality === "full") {
      this.buildDriftField();
      this.buildNearMotes();
    }
    if (props && !reducedMotion) {
      void this.mountContentProps(props);
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

    if (quality === "full" || this.phoneLayout) {
      // Camera must be part of the graph for its children (nebula) to render.
      // Phones keep the same wash — otherwise the scroll path looks empty vs desktop.
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

      if (quality === "full") {
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
    }

    // ASCII IS THE AESTHETIC — always on. The entire journey is living terminal art.
    // ?noascii=1 disables it (for comparison).
    const disableAscii =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("noascii");
    const useAscii = !disableAscii;
    this.useAscii = useAscii;

    // PURE PROCEDURAL ASCII: no 3D conversion. Math-generated Braille art.
    // Rendered as background via separate ortho scene.
    if (useAscii && this.useProcedural) {
      this.proceduralAsciiMat = createProceduralAscii({
        cellSize: { x: 12, y: 24 },
        colorA: new THREE.Color(palette.accent),
        colorB: new THREE.Color(palette.amber ?? "#ffb454"),
      });
      // Background scene with fullscreen quad.
      this.proceduralBgScene = new THREE.Scene();
      this.proceduralBgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const bgMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        this.proceduralAsciiMat,
      );
      bgMesh.frustumCulled = false;
      this.proceduralBgScene.add(bgMesh);
      updateProceduralAscii(
        this.proceduralAsciiMat,
        0,
        0,
        window.innerWidth,
        window.innerHeight,
      );
      // Mark ASCII active for CSS text readability overrides.
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-ascii", "active");
        const style = document.createElement("style");
        style.id = "ascii-text-override";
        style.textContent = `
          html[data-ascii="active"] body,
          html[data-ascii="active"] h1,
          html[data-ascii="active"] h2,
          html[data-ascii="active"] h3,
          html[data-ascii="active"] p,
          html[data-ascii="active"] span,
          html[data-ascii="active"] div,
          html[data-ascii="active"] a,
          html[data-ascii="active"] li {
            color: #ffffff !important;
            text-shadow: 0 2px 12px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,1) !important;
          }
        `;
        if (!document.getElementById("ascii-text-override")) {
          document.head.appendChild(style);
        }
      }
    }

    if ((quality === "full" && !this.useProcedural) || (useAscii && !this.useProcedural)) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      if (quality === "full" && !useAscii) {
        this.composer.addPass(
          new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.08,
            0.16,
            0.88,
          ),
        );
      }
      // Old 3D-to-ASCII pass disabled when using procedural.
      if (useAscii && !this.useProcedural) {
      }
      this.composer.setSize(window.innerWidth, window.innerHeight);
    } else {
      this.composer = null;
    }

    // BIG ASCII PERSON — posed per chapter, positioned along the journey.
    if (useAscii) {
      this.currentPose = "typing";
      this.asciiPerson = createAsciiPerson({
        pose: this.currentPose,
        colorA: new THREE.Color(palette.accent),
        colorB: new THREE.Color(palette.amber ?? "#ffb454"),
      });
      // Position to the side of the path, big and visible.
      this.asciiPerson.position.set(6, 0, 0);
      this.scene.add(this.asciiPerson);
    }

    if (!reducedMotion) {
      this.bindScroll();
      window.addEventListener("resize", this.handleResize);
      if (this.phoneLayout) {
        window.visualViewport?.addEventListener("resize", this.handleResize);
        window.visualViewport?.addEventListener("scroll", this.handleResize);
      }
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
  private buildStations(stationCounts: readonly number[], hasContentProps: boolean) {
    const tintColors = [
      new THREE.Color(this.palette.accent),
      new THREE.Color(this.palette.cyan),
      new THREE.Color(this.palette.emerald),
      new THREE.Color(this.palette.amber),
      new THREE.Color(this.palette.coral),
      new THREE.Color(this.palette.accent),
    ];

    const stationScale = this.phoneLayout
      ? [2.8, 2.7, 2.5, 2.7, 2.6, 2.8]
      : [3.8, 3.7, 3.3, 3.6, 3.4, 3.8];
    for (let i = 0; i < STATION_BUILDERS.length; i++) {
      const object = STATION_BUILDERS[i](tintColors[i], this.palette);
      this.parkOnPath(object, STATION_PATH_T[i], i % 2 ? 1 : -1, (i % 3 - 1) * 1.2, 3.2);
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
        // Tiny emissive elements (nodes, lights, pulses) skip the aura shell.
        if (mesh.userData.noAura) continue;
        const mat = mesh.material as THREE.ShaderMaterial;
        if (mat?.uniforms?.uTime) this.animatedMaterials.push(mat);
        const aura = new THREE.Mesh(mesh.geometry, auraMaterial(tintColors[i]));
        aura.scale.setScalar(1.045);
        mesh.add(aura);
        this.animatedMaterials.push(aura.material as THREE.ShaderMaterial);
      }

      // Thin anonymous dust where named props carry the content read.
      let count = Math.min(stationCounts[i] ?? 0, 60);
      if (hasContentProps && (i === 1 || i === 2 || i === 3 || i === 4)) {
        count = Math.min(count, i === 4 ? 8 : 12);
      }
      if (count > 0) {
        this.orbitDust.push(
          this.buildOrbitDust(object.position, count, tintColors[i], 0.1 + i * 0.05),
        );
      }
    }
  }

  /** Paper/project billboards + tech/role type — async so textures never block first paint. */
  private async mountContentProps(manifest: JourneyPropManifest) {
    const paletteColors = [
      new THREE.Color(this.palette.accent),
      new THREE.Color(this.palette.cyan),
      new THREE.Color(this.palette.emerald),
      new THREE.Color(this.palette.amber),
      new THREE.Color(this.palette.coral),
    ];
    const handles = await buildJourneyContentProps({
      manifest,
      theme: {
        lightTheme: this.lightTheme,
        inkAlpha: this.inkAlpha,
        blending: this.particleBlending,
        palette: paletteColors,
      },
      // Fade with section focus (camera t), while sculptures stay on STATION_PATH_T.
      stationPathT: [
        SECTION_PATH_T[1],
        SECTION_PATH_T[2],
        SECTION_PATH_T[3],
        SECTION_PATH_T[4],
        SECTION_PATH_T[5],
        SECTION_PATH_T[6],
      ],
      includeImages: this.quality === "full" || this.phoneLayout,
    });
    if (this.disposed) {
      for (const handle of handles) disposeContentProp(handle);
      return;
    }

    for (const handle of handles) {
      this.placeContentProp(handle);
      this.scene.add(handle.object);
      this.contentProps.push(handle);
    }
    this.renderer.domElement.dataset.journeyProps = String(this.contentProps.length);
  }

  private placeContentProp(handle: ContentPropHandle) {
    const station = this.stations[handle.stationIndex];
    const { object, kind } = handle;
    const { binormals, normals, tangents } = this.frenet;
    const stationSide = handle.stationIndex % 2 ? 1 : -1;
    // Portrait frustum is ~half as wide — desktop side parks sit off-frame.
    const lateral = this.phoneLayout ? 0.38 : 1;

    if (!station) {
      this.parkOnPath(object, handle.pathT, 1, 0, 2);
      return;
    }

    if (kind === "preview") {
      const slot = Number(object.userData.propSlot ?? 0);
      const side = Number(object.userData.propSide ?? 1);
      const parkT = STATION_PATH_T[handle.stationIndex] ?? handle.pathT;
      const parkIdx = Math.round(parkT * FRENET_SEGMENTS);
      // Sit between the path and the sculpture so frost still leaves readable silhouettes.
      object.position
        .copy(station.position)
        .addScaledVector(
          binormals[parkIdx],
          (-stationSide * (5.6 + slot * 0.4) + side * 0.9) * lateral,
        )
        .addScaledVector(normals[parkIdx], 0.35 - slot * 1.35)
        .addScaledVector(
          tangents[parkIdx],
          this.phoneLayout ? 1.2 + slot * 0.8 : -0.4 + slot * 1.1,
        );
      object.lookAt(this.camera.position);
      object.userData.basePosition = object.position.clone();
      object.userData.baseQuat = object.quaternion.clone();
      object.userData.spin = { y: 0.06, x: 0.03, bob: 0.18 };
      if (this.phoneLayout) object.scale.multiplyScalar(0.72);
      return;
    }

    if (kind === "tech") {
      const i = Number(object.userData.orbitIndex ?? 0);
      const n = Math.max(1, Number(object.userData.orbitCount ?? 1));
      const ring = i % 3;
      const radius = (this.phoneLayout ? 1.35 : 3.4) + ring * (this.phoneLayout ? 0.35 : 0.85);
      const angle = (i / n) * Math.PI * 2 + ring * 0.35;
      const parkT = STATION_PATH_T[handle.stationIndex] ?? handle.pathT;
      const parkIdx = Math.round(parkT * FRENET_SEGMENTS);

      if (this.phoneLayout) {
        // Orbit the camera tube itself so glyphs read in the portrait center.
        const p = this.curve.getPointAt(THREE.MathUtils.clamp(parkT, 0, 1));
        object.position
          .copy(p)
          .addScaledVector(binormals[parkIdx], Math.cos(angle) * radius)
          .addScaledVector(normals[parkIdx], Math.sin(angle * 1.35) * radius * 0.55)
          .addScaledVector(tangents[parkIdx], Math.sin(angle) * radius * 0.22);
        object.lookAt(this.camera.position);
        object.userData.basePosition = object.position.clone();
        object.userData.orbitAngle = angle;
        object.userData.orbitRadius = radius;
        object.userData.orbitRing = ring;
        object.scale.multiplyScalar(0.78);
        return;
      }

      // Anchor closer to the camera tube than the wireframe rack.
      const anchor = station.position
        .clone()
        .addScaledVector(binormals[parkIdx], -stationSide * 4.2)
        .addScaledVector(normals[parkIdx], 0.2);
      object.position
        .copy(anchor)
        .add(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle * 1.15) * 1.05 + (ring - 1) * 0.4,
            Math.sin(angle) * radius * 0.55,
          ),
        );
      object.lookAt(this.camera.position);
      object.userData.basePosition = object.position.clone();
      object.userData.orbitAngle = angle;
      object.userData.orbitRadius = radius;
      object.userData.orbitRing = ring;
      object.userData.anchor = anchor;
      return;
    }

    // Roles — gentle arc under the Experience sculpture, pulled toward the path.
    const i = Number(object.userData.roleIndex ?? 0);
    const n = Math.max(1, Number(object.userData.roleCount ?? 1));
    const t = n === 1 ? 0.5 : i / (n - 1);
    const arc = (t - 0.5) * (this.phoneLayout ? 2.4 : 6.2);
    const parkT = STATION_PATH_T[handle.stationIndex] ?? handle.pathT;
    const parkIdx = Math.round(parkT * FRENET_SEGMENTS);
    object.position
      .copy(station.position)
      .addScaledVector(
        binormals[parkIdx],
        (-stationSide * 4.8 + arc * 0.35) * lateral,
      )
      .addScaledVector(normals[parkIdx], -1.55 + Math.sin(t * Math.PI) * 0.35)
      .addScaledVector(tangents[parkIdx], -0.2 + t * 0.6);
    object.lookAt(this.camera.position);
    object.userData.basePosition = object.position.clone();
    object.userData.baseQuat = object.quaternion.clone();
    object.userData.spin = { y: 0.04, x: 0.02, bob: 0.12 };
    if (this.phoneLayout) object.scale.multiplyScalar(0.78);
  }

  /** Park a sculpture on the camera-path Frenet frame so scale-up never clips the tube. */
  /**
   * Chapter gates — numbered torus portals at the midpoint between stations.
   * The camera flies through them; they flash as chapters change.
   */
  /**
   * The continuous world — Adventure Time style: one unbroken environment
   * along the entire flight path, no empty gaps between chapters.
   * A luminous spine follows the curve, terrain banks flank it, and hundreds
   * of instanced crystals fill the space, shifting cyan→amber by chapter.
   */
  private buildContinuousWorld() {
    const cyan = new THREE.Color(this.palette.cyan);
    const amber = new THREE.Color(this.palette.amber);
    const accent = new THREE.Color(this.palette.accent);

    // 1 — World spine: a bright river of light following the whole path.
    const spinePts = this.curve.getSpacedPoints(140);
    const spineGeo = new THREE.BufferGeometry();
    const spinePos: number[] = [];
    const spineCol: number[] = [];
    const spineIdx: number[] = [];
    const tmpColor = new THREE.Color();
    const upVec = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < spinePts.length; i++) {
      const t = i / (spinePts.length - 1);
      const p = spinePts[i];
      const tangent = this.curve.getTangentAt(Math.min(t * PATH_END_T, PATH_END_T));
      const side = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const w = 0.9;
      spinePos.push(p.x - side.x * w, p.y - 0.7, p.z - side.z * w);
      spinePos.push(p.x + side.x * w, p.y - 0.7, p.z + side.z * w);
      tmpColor.copy(cyan).lerp(amber, THREE.MathUtils.smoothstep(t, 0.15, 0.85));
      // Bright center line.
      const bright = 0.7 + 0.3 * Math.sin(t * 40);
      spineCol.push(
        tmpColor.r * bright, tmpColor.g * bright, tmpColor.b * bright,
        tmpColor.r * bright, tmpColor.g * bright, tmpColor.b * bright,
      );
      if (i < spinePts.length - 1) {
        const a = i * 2;
        spineIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    spineGeo.setAttribute("position", new THREE.Float32BufferAttribute(spinePos, 3));
    spineGeo.setAttribute("color", new THREE.Float32BufferAttribute(spineCol, 3));
    // vT: 0→1 along the path for shader dashes; aAcross: 0 left, 1 right.
    const spineT: number[] = [];
    const spineAcross: number[] = [];
    for (let i = 0; i < spinePts.length; i++) {
      const t = i / (spinePts.length - 1);
      spineT.push(t, t);
      spineAcross.push(0, 1);
    }
    spineGeo.setAttribute("aT", new THREE.Float32BufferAttribute(spineT, 1));
    spineGeo.setAttribute("aAcross", new THREE.Float32BufferAttribute(spineAcross, 1));
    spineGeo.setIndex(spineIdx);
    // Rainbow Road surface: center dashes, grid, grain — not a flat ribbon.
    const spineMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: this.particleBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aT;
        attribute float aAcross;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vT;
        varying float vAcross;
        void main() {
          vColor = color;
          vT = aT;
          vAcross = aAcross;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vColor;
        varying float vT;
        varying float vAcross;
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        void main() {
          vec3 col = vColor;
          // Center dashes (Mario Kart).
          float across = vAcross;
          float dashMask = smoothstep(0.42, 0.46, across) * smoothstep(0.58, 0.54, across);
          float dash = step(0.5, fract(vT * 160.0)) * dashMask;
          col = mix(col, vec3(1.0), dash * 0.85);
          // Subtle grid.
          float grid = step(0.92, fract(vT * 80.0)) + step(0.92, fract(across * 6.0));
          col += vec3(0.12) * clamp(grid, 0.0, 1.0);
          // Grain.
          col *= 0.92 + 0.16 * hash(floor(vT * 400.0) + floor(across * 40.0));
          // Flowing energy pulse.
          float pulse = pow(fract(vT * 6.0 - uTime * 0.9), 10.0);
          col += vColor * pulse * 1.6;
          gl_FragColor = vec4(col, 0.9);
        }
      `,
    });
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.userData.noAura = true;
    this.scene.add(spine);
    this.animatedMaterials.push(spineMat);

    // 1b — Canyon walls: two terrain ribbons flanking the path like a valley.
    // You fly THROUGH the world, not past it.
    for (const wallSide of [-1, 1]) {
      const wallGeo = new THREE.BufferGeometry();
      const wallPos: number[] = [];
      const wallCol: number[] = [];
      const wallIdx: number[] = [];
      for (let i = 0; i < spinePts.length; i++) {
        const t = i / (spinePts.length - 1);
        const p = spinePts[i];
        const tangent = this.curve.getTangentAt(Math.min(t * PATH_END_T, PATH_END_T));
        const side = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
        // Inner edge near path, outer edge rising like a hillside.
        const inner = 3.2;
        const outer = 9;
        const liftInner = 0.5;
        const liftOuter = 3.5 + Math.sin(t * 25 + wallSide) * 1.2;
        wallPos.push(
          p.x + side.x * wallSide * inner, p.y - liftInner, p.z + side.z * wallSide * inner,
          p.x + side.x * wallSide * outer, p.y + liftOuter, p.z + side.z * wallSide * outer,
        );
        tmpColor.copy(cyan).lerp(amber, THREE.MathUtils.smoothstep(t, 0.15, 0.85));
        tmpColor.multiplyScalar(0.35); // Darker than spine — terrain, not light.
        wallCol.push(tmpColor.r, tmpColor.g, tmpColor.b, tmpColor.r * 0.6, tmpColor.g * 0.6, tmpColor.b * 0.6);
        if (i < spinePts.length - 1) {
          const a = i * 2;
          if (wallSide > 0) wallIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
          else wallIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      wallGeo.setAttribute("position", new THREE.Float32BufferAttribute(wallPos, 3));
      wallGeo.setAttribute("color", new THREE.Float32BufferAttribute(wallCol, 3));
      wallGeo.setIndex(wallIdx);
      const wallMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: this.particleBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.userData.noAura = true;
      this.scene.add(wall);
    }

    // 2 — Scatter field: instanced crystals filling the world tube.
    const scatterCount = this.quality === "full" ? 420 : 200;
    const crystalGeo = new THREE.OctahedronGeometry(0.34, 0);
    const crystalMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.75,
      blending: this.particleBlending,
      depthWrite: false,
    });
    const scatter = new THREE.InstancedMesh(crystalGeo, crystalMat, scatterCount);
    scatter.userData.noAura = true;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < scatterCount; i++) {
      const t = Math.random() * PATH_END_T;
      const p = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(side, tangent).normalize();
      const lateral = (Math.random() - 0.5) * 16;
      const vertical = (Math.random() - 0.5) * 10;
      // Keep clear of the immediate flight corridor.
      const clear = Math.abs(lateral) < 2.5 && Math.abs(vertical) < 2 ? 4 : 0;
      dummy.position
        .copy(p)
        .addScaledVector(side, lateral + Math.sign(lateral || 1) * clear)
        .addScaledVector(up, vertical);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      const s = 0.4 + Math.random() * 1.4;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      scatter.setMatrixAt(i, dummy.matrix);
      col.copy(cyan).lerp(amber, THREE.MathUtils.smoothstep(t, 0.15, 0.85));
      // Vary brightness for depth.
      col.multiplyScalar(0.5 + Math.random() * 0.5);
      scatter.setColorAt(i, col);
    }
    scatter.instanceMatrix.needsUpdate = true;
    if (scatter.instanceColor) scatter.instanceColor.needsUpdate = true;
    this.scene.add(scatter);

    // 3 — Biome outriders: each chapter's motif echoes along the path,
    // extending the biome beyond its station so regions blend together.
    const outriderGeo = new THREE.TetrahedronGeometry(0.3, 0);
    const outriderMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.4,
      blending: this.particleBlending,
      depthWrite: false,
      wireframe: true,
    });
    const outriders = new THREE.InstancedMesh(outriderGeo, outriderMat, 120);
    outriders.userData.noAura = true;
    for (let i = 0; i < 120; i++) {
      // Cluster around chapter regions, spilling into the gaps.
      const chapter = Math.floor(Math.random() * 6);
      const centerT = STATION_PATH_T[chapter];
      const t = THREE.MathUtils.clamp(
        centerT + (Math.random() - 0.5) * 0.12,
        0,
        PATH_END_T,
      );
      const p = this.curve.getPointAt(t);
      dummy.position.set(
        p.x + (Math.random() - 0.5) * 14,
        p.y + (Math.random() - 0.5) * 8,
        p.z + (Math.random() - 0.5) * 14,
      );
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(0.5 + Math.random());
      dummy.updateMatrix();
      outriders.setMatrixAt(i, dummy.matrix);
    }
    outriders.instanceMatrix.needsUpdate = true;
    this.scene.add(outriders);
  }

  /**
   * Build a detailed planet with displaced terrain, atmosphere shell,
   * and banded rings. Far beyond a wireframe sphere.
   */
  private buildDetailedPlanet(
    radius: number,
    color: THREE.Color,
    seed: number,
    hasRings: boolean,
  ): THREE.Group {
    const group = new THREE.Group();
    const simplex = new SimplexNoise();

    // Displaced terrain core — fBm + ridged mountains + craters.
    const geo = new THREE.IcosahedronGeometry(radius, 24);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const heights = new Float32Array(pos.count);
    const craters: Array<{ dir: THREE.Vector3; r: number; depth: number }> = [];
    for (let c = 0; c < 28; c++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();
      craters.push({ dir, r: 0.08 + Math.random() * 0.16, depth: 0.05 + Math.random() * 0.08 });
    }
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      let h = 0;
      let amp = 1;
      let freq = 1.6;
      for (let o = 0; o < 4; o++) {
        h += amp * simplex.noise3d(v.x * freq + seed, v.y * freq, v.z * freq);
        amp *= 0.5;
        freq *= 2.15;
      }
      const r = simplex.noise3d(v.x * 3.1 + seed * 2.7, v.y * 3.1, v.z * 3.1);
      const ridged = Math.pow(1 - Math.abs(r), 3);
      let d = h * 0.09 + ridged * 0.14;
      // Craters.
      for (const crater of craters) {
        const angle = v.angleTo(crater.dir);
        if (angle < crater.r * 1.4) {
          const t = angle / (crater.r * 1.4);
          d -= crater.depth * Math.max(0, 1 - t * 1.4);
          // Rim.
          if (t > 0.7 && t < 1.1) d += crater.depth * 0.4 * Math.sin((t - 0.7) * Math.PI / 0.4);
        }
      }
      heights[i] = d;
      v.multiplyScalar(radius * (1 + d));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.setAttribute("aHeight", new THREE.BufferAttribute(heights, 1));
    geo.computeVertexNormals();

    // Height-colored terrain material.
    const terrainMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: this.particleBlending,
      uniforms: {
        uColor: { value: color.clone() },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aHeight;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vHeight = aHeight;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec3 deep = uColor * 0.35;
          vec3 mid = uColor;
          vec3 peak = mix(uColor, vec3(1.0), 0.65);
          vec3 col = mix(deep, mid, smoothstep(-0.12, 0.02, vHeight));
          col = mix(col, peak, smoothstep(0.06, 0.2, vHeight));
          float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 1.6);
          gl_FragColor = vec4(col, 0.85 * (0.55 + 0.45 * fresnel));
        }
      `,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.userData.noAura = true;
    group.add(terrain);
    this.animatedMaterials.push(terrainMat);

    // Wireframe overlay on the displaced terrain (1.002x).
    const wire = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
        blending: this.particleBlending,
        depthWrite: false,
      }),
    );
    wire.scale.setScalar(1.002);
    wire.userData.noAura = true;
    group.add(wire);

    // Atmosphere shell — fresnel glow at 1.18x.
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
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
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float rim = pow(max(0.0, 0.28 - dot(normalize(vNormal), normalize(vView))), 3.2);
          gl_FragColor = vec4(uColor * rim * 2.2, rim * 0.85);
        }
      `,
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.18, 32, 24), atmoMat);
    atmo.userData.noAura = true;
    group.add(atmo);

    // Banded rings (if requested).
    if (hasRings) {
      const ringMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: this.particleBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uColor: { value: color.clone() },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying vec2 vUv;
          float hash(float n) { return fract(sin(n) * 43758.5453); }
          void main() {
            float band = fract(vUv.x * 14.0);
            float brightness = 0.35 + 0.65 * hash(floor(vUv.x * 14.0));
            float grain = 0.85 + 0.3 * hash(floor(vUv.x * 140.0));
            float alpha = smoothstep(0.0, 0.12, band) * smoothstep(1.0, 0.88, band);
            gl_FragColor = vec4(uColor * brightness * grain, alpha * 0.75);
          }
        `,
      });
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.35, radius * 1.95, 64, 4),
        ringMat,
      );
      ring.rotation.x = Math.PI / 2.4;
      ring.userData.noAura = true;
      group.add(ring);
      this.animatedMaterials.push(ringMat);
    }

    return group;
  }

  /**
   * The cosmos — planets, city, forests, nebulae. A rich world you fly
   * through, Mario Kart Rainbow Road energy: dense, playful, surprising.
   */
  private buildCosmos() {
    const cyan = new THREE.Color(this.palette.cyan);
    const amber = new THREE.Color(this.palette.amber);
    const accent = new THREE.Color(this.palette.accent);
    const emerald = new THREE.Color(this.palette.emerald);
    const upVec = new THREE.Vector3(0, 1, 0);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    // 1 — Planets: detailed worlds with terrain, atmosphere, banded rings.
    const planetDefs = [
      { t: 0.1, r: 2.2, color: cyan, rings: false, seed: 1.7 }, // Hero
      { t: 0.24, r: 1.8, color: accent, rings: true, seed: 4.2 }, // About
      { t: 0.38, r: 2.4, color: cyan, rings: true, seed: 8.9 }, // Publications
      { t: 0.52, r: 2.0, color: emerald, rings: false, seed: 3.3 }, // Experience
      { t: 0.66, r: 2.6, color: amber, rings: true, seed: 6.1 }, // Projects
      { t: 0.8, r: 2.2, color: amber, rings: false, seed: 9.4 }, // Skills/Contact
    ];
    for (const def of planetDefs) {
      const p = this.curve.getPointAt(def.t);
      const tangent = this.curve.getTangentAt(def.t);
      const side = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const planetGroup = this.buildDetailedPlanet(def.r, def.color, def.seed, def.rings);
      // Offset to the side so you fly PAST, not through.
      planetGroup.position.copy(p).addScaledVector(side, 7 * (def.seed > 5 ? 1 : -1));
      planetGroup.position.y += 2;
      // Moons.
      for (let m = 0; m < 2; m++) {
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 10, 8),
          new THREE.MeshBasicMaterial({
            color: def.color,
            transparent: true,
            opacity: 0.7,
            blending: this.particleBlending,
            depthWrite: false,
          }),
        );
        const a = (m / 2) * Math.PI * 2 + def.seed;
        moon.position.set(
          Math.cos(a) * def.r * 2.1,
          Math.sin(a) * 0.9,
          Math.sin(a) * def.r * 2.1,
        );
        moon.userData.noAura = true;
        planetGroup.add(moon);
      }
      this.scene.add(planetGroup);
    }

    // 2 — Crystal forests: clusters of glowing spires.
    const treeCount = this.quality === "full" ? 180 : 90;
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.14, 1.6, 6);
    const trunkMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.6,
      blending: this.particleBlending,
      depthWrite: false,
    });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    trunks.userData.noAura = true;
    const topGeo = new THREE.OctahedronGeometry(0.42, 0);
    const topMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.75,
      blending: this.particleBlending,
      depthWrite: false,
      wireframe: true,
    });
    const tops = new THREE.InstancedMesh(topGeo, topMat, treeCount);
    tops.userData.noAura = true;
    for (let i = 0; i < treeCount; i++) {
      const t = Math.random() * PATH_END_T;
      const p = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const lateral = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 7);
      const baseY = p.y - 1.2;
      const h = 1 + Math.random() * 2.2;
      dummy.position.copy(p).addScaledVector(side, lateral);
      dummy.position.y = baseY + h / 2;
      dummy.scale.set(1, h / 1.6, 1);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      col.copy(cyan).lerp(amber, THREE.MathUtils.smoothstep(t, 0.15, 0.85));
      trunks.setColorAt(i, col);
      // Glowing top.
      dummy.position.y = baseY + h + 0.3;
      dummy.scale.setScalar(0.7 + Math.random() * 0.8);
      dummy.updateMatrix();
      tops.setMatrixAt(i, dummy.matrix);
      tops.setColorAt(i, col);
    }
    trunks.instanceMatrix.needsUpdate = true;
    tops.instanceMatrix.needsUpdate = true;
    if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
    if (tops.instanceColor) tops.instanceColor.needsUpdate = true;
    this.scene.add(trunks);
    this.scene.add(tops);

    // 3 — Cityscape: buildings with emissive window grids (in-shader).
    const bldgCount = this.quality === "full" ? 120 : 60;
    const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
    const bldgMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: this.particleBlending,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: cyan.clone() },
        uColorB: { value: amber.clone() },
      },
      vertexShader: `
        varying vec3 vWPos;
        varying vec3 vNormal;
        void main() {
          vec4 wp = instanceMatrix * vec4(position, 1.0);
          vWPos = (modelMatrix * wp).xyz;
          vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
          gl_Position = projectionMatrix * modelMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying vec3 vWPos;
        varying vec3 vNormal;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          // Window grid from world position.
          vec2 gv = abs(vNormal.y) > 0.5 ? vWPos.xz / vec2(0.9, 0.9) : vWPos.xy / vec2(0.9, 1.1);
          vec2 cell = floor(gv);
          vec2 f = fract(gv);
          float winMask = step(0.2, f.x) * step(f.x, 0.8) * step(0.3, f.y) * step(f.y, 0.7);
          float rnd = hash(cell + floor(uTime * 0.1));
          vec3 winColor = mix(uColorA, uColorB, step(0.6, hash(cell + 7.0)));
          float lit = step(0.4, rnd);
          // Base facade.
          vec3 col = mix(uColorA * 0.25, uColorB * 0.25, 0.5);
          // Emissive windows.
          col += winColor * winMask * lit * 1.4;
          // Floor slabs.
          float slab = smoothstep(0.0, 0.08, f.y) * smoothstep(1.0, 0.92, f.y);
          col *= 0.7 + 0.3 * slab;
          gl_FragColor = vec4(col, 0.85);
        }
      `,
    });
    const buildings = new THREE.InstancedMesh(bldgGeo, bldgMat, bldgCount);
    buildings.userData.noAura = true;
    for (let i = 0; i < bldgCount; i++) {
      // Concentrate in the Experience/Projects region (t 0.45-0.7).
      const t = 0.42 + Math.random() * 0.3;
      const p = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const lateral = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 8);
      const w = 0.8 + Math.random() * 1.6;
      const h = 2 + Math.random() * 6;
      const d = 0.8 + Math.random() * 1.6;
      dummy.position.copy(p).addScaledVector(side, lateral);
      dummy.position.y = p.y - 1 + h / 2;
      dummy.scale.set(w, h, d);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      buildings.setMatrixAt(i, dummy.matrix);
      col.copy(cyan).lerp(amber, 0.4 + Math.random() * 0.4);
      buildings.setColorAt(i, col);
    }
    buildings.instanceMatrix.needsUpdate = true;
    if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
    this.scene.add(buildings);
    this.animatedMaterials.push(bldgMat as THREE.ShaderMaterial);

    // 4 — Nebula clouds: soft additive sprites for depth.
    for (let i = 0; i < 14; i++) {
      const t = (i / 14) * PATH_END_T;
      const p = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const neb = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getSoftDotTexture(),
          color: col.copy(cyan).lerp(amber, t / PATH_END_T).clone(),
          transparent: true,
          opacity: 0.14,
          blending: this.particleBlending,
          depthWrite: false,
        }),
      );
      neb.position
        .copy(p)
        .addScaledVector(side, (Math.random() - 0.5) * 24)
        .add(new THREE.Vector3(0, (Math.random() - 0.5) * 12, 0));
      const s = 14 + Math.random() * 18;
      neb.scale.set(s, s, 1);
      neb.userData.noAura = true;
      this.scene.add(neb);
    }

    // 5 — Floating islands: rock chunks with glowing caps.
    const islandCount = this.quality === "full" ? 24 : 12;
    for (let i = 0; i < islandCount; i++) {
      const t = Math.random() * PATH_END_T;
      const p = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const island = new THREE.Group();
      island.position
        .copy(p)
        .addScaledVector(side, (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 6));
      island.position.y += 1 + Math.random() * 4;
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.8 + Math.random() * 1.2, 0),
        new THREE.MeshBasicMaterial({
          color: col.copy(cyan).lerp(amber, t / PATH_END_T).clone(),
          transparent: true,
          opacity: 0.4,
          wireframe: true,
          blending: this.particleBlending,
          depthWrite: false,
        }),
      );
      rock.scale.y = 0.6;
      rock.userData.noAura = true;
      island.add(rock);
      // Glowing cap.
      const cap = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3, 0),
        new THREE.MeshBasicMaterial({
          color: amber,
          transparent: true,
          opacity: 0.8,
          blending: this.particleBlending,
          depthWrite: false,
        }),
      );
      cap.position.y = 0.9;
      cap.userData.noAura = true;
      island.add(cap);
      island.userData.floatPhase = Math.random() * Math.PI * 2;
      this.floatingIslands.push(island);
      this.scene.add(island);
    }

    // 6 — Rainbow road rails: glowing tubes along the spine edges.
    const railPts = this.curve.getSpacedPoints(80);
    for (const railSide of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < railPts.length; i++) {
        const t = i / (railPts.length - 1);
        const p = railPts[i];
        const tangent = this.curve.getTangentAt(Math.min(t * PATH_END_T, PATH_END_T));
        const side = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
        pts.push(
          new THREE.Vector3(
            p.x + side.x * railSide * 1.1,
            p.y - 0.5,
            p.z + side.z * railSide * 1.1,
          ),
        );
      }
      const railCurve = new THREE.CatmullRomCurve3(pts);
      const rail = new THREE.Mesh(
        new THREE.TubeGeometry(railCurve, 80, 0.07, 6, false),
        new THREE.MeshBasicMaterial({
          color: railSide > 0 ? amber : cyan,
          transparent: true,
          opacity: 0.8,
          blending: this.particleBlending,
          depthWrite: false,
        }),
      );
      rail.userData.noAura = true;
      this.scene.add(rail);
    }
  }

  private buildChapterGates() {
    const gateColor = new THREE.Color(this.palette.cyan);
    for (let i = 0; i < STATION_PATH_T.length - 1; i++) {
      const t = (STATION_PATH_T[i] + STATION_PATH_T[i + 1]) / 2;
      const gate = new THREE.Mesh(
        new THREE.TorusGeometry(3.4, 0.09, 8, 64),
        new THREE.MeshBasicMaterial({
          color: gateColor,
          transparent: true,
          opacity: 0.5,
          blending: this.particleBlending,
          depthWrite: false,
        }),
      );
      gate.userData.noAura = true;
      const p = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t, new THREE.Vector3());
      gate.position.copy(p);
      // Face the gate along the path so the camera flies through it.
      gate.lookAt(p.clone().add(tangent));
      gate.userData.gateT = t;
      this.scene.add(gate);
      this.chapterGates.push(gate);
    }
  }

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
    // Stations hug the flight path so chapters surround the camera like
    // biomes; phones need ~3.4 to stay framed.
    const sideDist = this.phoneLayout ? 3.4 : 4.0;
    object.position
      .copy(p)
      .addScaledVector(binormals[idx], side * sideDist)
      .addScaledVector(normals[idx], lift * (this.phoneLayout ? 0.85 : 1.4))
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
    const { w, h } = this.phoneLayout
      ? this.viewSize()
      : { w: window.innerWidth, h: window.innerHeight };
    const aspect = w / Math.max(1, h);
    const scale = Math.min(1, aspect / LANDSCAPE_FIT_ASPECT);
    this.textGroup.scale.setScalar(
      scale * HERO_WORDMARK_FIT * (this.phoneLayout ? PHONE_HERO_WORDMARK_FIT : 1),
    );
    this.arrivalGroup.scale.setScalar(scale);
    // Portrait stacks the hero copy tall, so lift the glyph clear of it.
    const lift = (1 - scale) * PORTRAIT_WORDMARK_LIFT;
    this.textGroup.position.y = 0.4 + lift;
    this.arrivalGroup.position.copy(this.arrivalPark);
    this.arrivalGroup.position.y += lift;
  }

  private viewSize() {
    const viewport = window.visualViewport;
    const w = Math.max(1, Math.round(viewport?.width ?? window.innerWidth));
    const h = Math.max(1, Math.round(viewport?.height ?? window.innerHeight));
    return { w, h };
  }

  /** Sit LET'S CONNECT ahead of the camera at Contact, facing the lens. */
  private parkArrivalWordmark() {
    const t = SECTION_PATH_T[6];
    const p = this.curve.getPointAt(t);
    this.curve.getTangentAt(t, this.tangent);
    this.arrivalGroup.position.copy(p).addScaledVector(this.tangent, 16);
    this.arrivalPark.copy(this.arrivalGroup.position);
  }

  private readonly handleResize = () => {
    if (this.phoneLayout) {
      const { w, h } = this.viewSize();
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
      this.composer?.setSize(w, h);
      const pixelScale = h * 0.5;
      for (const mat of this.animatedMaterials) {
        if (mat.uniforms.uPixelScale) mat.uniforms.uPixelScale.value = pixelScale;
      }
      this.fitWordmarks();
      return;
    }

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
    if (this.proceduralAsciiMat) {
      updateProceduralAscii(
        this.proceduralAsciiMat,
        this.timer.getElapsed(),
        this.smoothT,
        window.innerWidth,
        window.innerHeight,
      );
    }
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

  private blendedStationPos(t: number) {
    if (this.stations.length === 0) return undefined;
    return interpolateStationPosition(t, this.stations.map((station) => station.position));
  }

  private publishProgress(t: number) {
    const value = Number.isFinite(t) ? t : 0;
    this.renderer.domElement.dataset.journeyT = value.toFixed(4);
    this.onProgress?.(value);
  }

  private renderOneFrame(time: number, dt = 1 / 60) {
    // `time` is elapsed seconds.
    const t = Math.max(0, time);
    const scatter = this.reducedMotion ? 0 : THREE.MathUtils.smoothstep(this.smoothT, 0.05, 0.22);
    (this.textPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = scatter;
    (this.textPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    this.textGroup.rotation.y = Math.sin(t * 0.15) * 0.06;

    // Gather LET'S CONNECT as Contact comes into focus.
    const arrive = this.reducedMotion
      ? 0
      : 1 - THREE.MathUtils.smoothstep(this.smoothT, 0.62, 0.86);
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = arrive;
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    this.arrivalGroup.visible = !this.reducedMotion && this.smoothT > 0.58;

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
      this.updateContentProps(t);
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
    this.arrivalGroup.lookAt(this.camera.position);
    const stationPos = this.blendedStationPos(pathT);
    const look = resolveJourneyLookTarget({
      t: pathT,
      cameraPos: pos,
      tangent: this.tangent,
      textPos: this.textGroup.position,
      arrivalPos: this.arrivalGroup.position,
      stationPos,
      stationWeight: this.phoneLayout ? 0.18 : 0.42,
    });
    this.lookTarget.set(look.x, look.y, look.z);
    if (!this.reducedMotion && pathT < 0.78) {
      const linger = THREE.MathUtils.smoothstep(this.smoothT, 0.82, PATH_END_T);
      this.lookTarget.x += Math.sin(t * 0.31) * 0.18 * linger;
      this.lookTarget.y += Math.cos(t * 0.24) * 0.1 * linger;
      if (this.pointerLookEnabled) {
        this.lookTarget.x += this.pointer.x * 0.32;
        this.lookTarget.y += this.pointer.y * 0.2;
      }
    }
    if (!this.lookPrimed) {
      this.lookSmoothed.copy(this.lookTarget);
      this.lookPrimed = true;
    } else {
      this.lookSmoothed.lerp(this.lookTarget, 1 - Math.exp(-5.2 * dt));
    }
    this.camera.lookAt(this.lookSmoothed);
    this.renderer.domElement.dataset.journeyLook = journeyLookName({
      look: this.lookSmoothed,
      textPos: this.textGroup.position,
      arrivalPos: this.arrivalGroup.position,
    });

    if (!this.reducedMotion) {
      this.updateStoryBeats(t, pathT);
    }

    // PROCEDURAL ASCII: update time + scroll. Pure math art, no 3D conversion.
    if (this.proceduralAsciiMat) {
      updateProceduralAscii(
        this.proceduralAsciiMat,
        t,
        this.smoothT,
        window.innerWidth,
        window.innerHeight,
      );
    }

    // BIG ASCII PERSON: update pose per chapter, animate.
    if (this.asciiPerson) {
      const pose = poseForProgress(this.smoothT);
      if (pose !== this.currentPose) {
        // Rebuild person with new pose.
        this.scene.remove(this.asciiPerson);
        this.asciiPerson.geometry.dispose();
        (this.asciiPerson.material as THREE.Material).dispose();
        this.currentPose = pose;
        this.asciiPerson = createAsciiPerson({
          pose,
          colorA: new THREE.Color(this.palette.accent),
          colorB: new THREE.Color(this.palette.amber ?? "#ffb454"),
        });
        this.asciiPerson.position.set(6, 0, 0);
        this.scene.add(this.asciiPerson);
      }
      updateAsciiPerson(this.asciiPerson, t);
      // Person follows the camera along the journey.
      // Position to the side, at normal scale, so the humanoid shape reads.
      const pathPos = this.curve.getPointAt(this.smoothT);
      const pathTangent = this.curve.getTangentAt(this.smoothT);
      const side = new THREE.Vector3()
        .crossVectors(pathTangent, new THREE.Vector3(0, 1, 0))
        .normalize();
      const ahead = pathTangent.clone().multiplyScalar(6);
      this.asciiPerson.position.copy(pathPos).addScaledVector(side, 4.5).add(ahead);
      this.asciiPerson.position.y = pathPos.y;
      this.asciiPerson.scale.setScalar(1.0); // Normal scale — shape matters more than size
      // Face the camera.
      this.asciiPerson.lookAt(this.camera.position);
    }

    this.composer?.render();
    if (!this.composer) {
      // Render procedural ASCII background first, then 3D scene on top.
      if (this.proceduralBgScene && this.proceduralBgCamera) {
        this.renderer.autoClear = false;
        this.renderer.clear();
        this.renderer.render(this.proceduralBgScene, this.proceduralBgCamera);
        this.renderer.render(this.scene, this.camera);
        this.renderer.autoClear = true;
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  /**
   * Story beats driven by time + scroll progress: hero spark pulse, compile
   * rings, citation pulses, beacon signal rings, gate flashes, fog warming.
   */
  private updateStoryBeats(t: number, pathT: number) {
    // Hero spark ignition pulse.
    if (this.heroSpark) {
      const s = 1 + Math.sin(t * 2.2) * 0.18;
      this.heroSpark.scale.setScalar(s);
      this.heroSpark.rotation.y = t * 0.8;
      this.heroSpark.rotation.x = t * 0.5;
    }
    for (const ring of this.heroRings) {
      const i = (ring.userData.compileRing ?? 0) as number;
      const cycle = (t * 0.35 + i / 3) % 1;
      const r = 0.35 + cycle * 1.4;
      ring.scale.setScalar(r / 0.35);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - cycle);
    }
    // Citation pulses travel the beam; beacon rings expand.
    for (const station of this.stations) {
      station.traverse((child) => {
        const u = child.userData;
        if (u.pulseOffset !== undefined) {
          const cycle = (t * 0.4 + (u.pulseOffset as number)) % 1;
          child.position.x = -0.65 + cycle * 1.5;
          (child as THREE.Mesh).scale.setScalar(0.7 + Math.sin(cycle * Math.PI) * 0.6);
        }
        if (u.signalRing !== undefined) {
          const i = u.signalRing as number;
          const cycle = (t * 0.3 + i / 3) % 1;
          const s = 1 + cycle * 1.6;
          child.scale.setScalar(s);
          const mat = (child as THREE.Mesh).material as THREE.ShaderMaterial;
          if (mat.uniforms?.uOpacity) mat.uniforms.uOpacity.value = 0.5 * (1 - cycle);
        }
      });
    }
    // Gate flash as the camera crosses each chapter threshold.
    for (const gate of this.chapterGates) {
      const gateT = gate.userData.gateT as number;
      const dist = Math.abs(pathT - gateT);
      const flash = Math.max(0, 1 - dist / 0.03);
      (gate.material as THREE.MeshBasicMaterial).opacity = 0.22 + flash * 0.65;
      const s = 1 + flash * 0.12;
      gate.scale.setScalar(s);
    }
    // Fog warms from cyan-tech to amber-human along the journey.
    if (this.fogCool && this.fogWarm && this.scene.fog instanceof THREE.FogExp2) {
      const warm = THREE.MathUtils.smoothstep(pathT, 0.15, 0.85);
      this.scene.fog.color.copy(this.fogCool).lerp(this.fogWarm, warm * 0.8);
    }
    // Floating islands bob gently.
    for (const island of this.floatingIslands) {
      const phase = (island.userData.floatPhase ?? 0) as number;
      island.position.y += Math.sin(t * 0.6 + phase) * 0.003;
      island.rotation.y = t * 0.05 + phase;
    }
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
    this.smoothT += (this.targetT - this.smoothT) * (1 - Math.exp(-1.85 * dt));
    if (!Number.isFinite(this.smoothT)) this.smoothT = this.targetT;
    this.renderOneFrame(t, dt);
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

  /** Float / orbit content props and fade them in near their chapter. */
  private updateContentProps(time: number) {
    if (this.contentProps.length === 0) return;
    for (const handle of this.contentProps) {
      const presence = propPresence(this.smoothT, handle.pathT, handle.kind === "tech" ? 0.18 : 0.16);
      const visible = presence > 0.02;
      handle.object.visible = visible;
      if (!visible) continue;

      const opacity = handle.baseOpacity * (0.2 + 0.8 * presence);
      for (const material of handle.materials) {
        if ("opacity" in material) {
          (material as THREE.MeshBasicMaterial).opacity = opacity;
        }
      }

      if (handle.kind === "tech") {
        if (this.phoneLayout) {
          const base = handle.object.userData.basePosition as THREE.Vector3 | undefined;
          if (!base) continue;
          const angle = Number(handle.object.userData.orbitAngle ?? 0);
          handle.object.position.copy(base);
          handle.object.position.x += Math.cos(time * 0.18 + angle) * 0.22;
          handle.object.position.y += Math.sin(time * 0.24 + angle * 1.3) * 0.18;
          handle.object.lookAt(this.camera.position);
          continue;
        }
        const anchor = handle.object.userData.anchor as THREE.Vector3 | undefined;
        if (!anchor) continue;
        const baseAngle = Number(handle.object.userData.orbitAngle ?? 0);
        const radius = Number(handle.object.userData.orbitRadius ?? 5);
        const ring = Number(handle.object.userData.orbitRing ?? 0);
        const angle = baseAngle + time * (0.12 + ring * 0.03);
        handle.object.position.set(
          anchor.x + Math.cos(angle) * radius,
          anchor.y + Math.sin(angle * 1.15 + time * 0.4) * 1.2 + (ring - 1) * 0.45,
          anchor.z + Math.sin(angle) * radius * 0.42,
        );
        handle.object.lookAt(this.camera.position);
        continue;
      }

      const base = handle.object.userData.basePosition as THREE.Vector3 | undefined;
      const spin = (handle.object.userData.spin ?? { y: 0.06, x: 0.03, bob: 0.16 }) as StationSpin;
      if (base) {
        handle.object.position.copy(base);
        handle.object.position.y += Math.sin(time * 0.55 + handle.pathT * 8) * spin.bob;
      }
      // Billboard so paper/project cards and role type stay readable as the camera drifts.
      handle.object.lookAt(this.camera.position);
      handle.object.rotateY(Math.sin(time * 0.22 + handle.pathT * 4) * spin.y * 0.35);
      if (spin.x) handle.object.rotateX(Math.sin(time * 0.16 + handle.pathT * 3) * spin.x * 0.35);
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
    window.visualViewport?.removeEventListener("resize", this.handleResize);
    window.visualViewport?.removeEventListener("scroll", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointerMove);
    for (const handle of this.contentProps) {
      this.scene.remove(handle.object);
      disposeContentProp(handle);
    }
    this.contentProps.length = 0;
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