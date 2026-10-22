"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";

/**
 * AsciiPerson3D — staged 3D ASCII humanoid built from instanced glyph
 * billboards arranged in 3D space (Effulgence-RPG style: text symbols as
 * geometry, not post-processing).
 *
 * Two stage modes, cross-faded by scroll chapter:
 * - "bust": monumental neck-up bust (head + neck + shoulders), scaled large,
 *   floating center-right BEHIND the content at low opacity, slow turntable,
 *   watching the cursor. Shown for home / about / publications / skills /
 *   contact (contact adds a friendly nod).
 * - "work": full seated figure at an ASCII desk + monitor + keyboard, hands in
 *   a seamless typing loop. Shown for experience / projects.
 *
 * The figure is never static: breathing, head micro-movements, periodic
 * blinking, the turntable (bust) and the typing loop (work) run continuously,
 * independent of scroll. Reduced motion snaps everything to a still pose.
 */

type StageMode = "bust" | "work";

const SECTION_MODE: Record<string, StageMode> = {
  home: "bust",
  about: "bust",
  publications: "bust",
  experience: "work",
  projects: "work",
  skills: "bust",
  contact: "bust",
};

const SECTION_IDS = ["home", "about", "publications", "experience", "projects", "skills", "contact"];

const BODY_COLOR = new THREE.Color("#7dd3fc"); // FROST ice cyan
const SCREEN_COLOR = new THREE.Color("#eef7ff"); // bright monitor screen
const DONUT_COLOR = new THREE.Color("#7dd3fc").multiplyScalar(0.5); // dim ice

// ---------------------------------------------------------------------------
// Seeded RNG (stable glyph layouts across mounts).
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Glyph atlas: 8x8 grid of 64 glyphs ordered by ink density.
// ---------------------------------------------------------------------------

const RAMP10 = " .:-=+*#%@";
const SYMBOL_DENSITY: ReadonlyArray<readonly [string, number]> = [
  [" ", 0], [".", 1], ["'", 1], [":", 2], [";", 2], ["-", 3], ["=", 4],
  ["+", 5], ["*", 6], ["x", 6], ["#", 7], ["%", 8], ["@", 9],
  ["0", 6], ["1", 5], ["{", 5], ["}", 5], ["[", 4], ["]", 4],
  ["M", 8], ["K", 7], ["S", 5], ["$", 7], ["&", 8], ["?", 4],
];

function buildAtlasGlyphs(): string[] {
  const rng = mulberry32(20261016);
  const out: string[] = [];
  for (let i = 0; i < 64; i++) {
    const d = (i / 63) * 9; // target density 0..9
    if (i === 0) {
      out.push(" ");
      continue;
    }
    if (rng() < 0.24) {
      // Pick a symbol whose density is near the target.
      const near = SYMBOL_DENSITY.filter(([, dd]) => Math.abs(dd - d) <= 1.5);
      const pool = near.length > 0 ? near : SYMBOL_DENSITY;
      out.push(pool[Math.floor(rng() * pool.length)]![0]);
    } else {
      out.push(RAMP10[Math.min(9, Math.round(d))]!);
    }
  }
  return out;
}

function buildAtlasTexture(glyphs: string[]): THREE.CanvasTexture {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S * 8;
  canvas.height = S * 8;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `700 ${Math.floor(S * 0.72)}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  // No shadowBlur: glow makes adjacent glyphs bleed into a solid mass.
  // Crisp glyph edges are what make ASCII art read as characters.
  for (let g = 0; g < 64; g++) {
    const col = g % 8;
    const row = Math.floor(g / 8);
    ctx.fillText(glyphs[g]!, col * S + S / 2, row * S + S / 2 + S * 0.03);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  // No mipmaps: glyph quads render at ~10px on screen while atlas cells are
  // 128px, so the GPU would minify through mipmap levels ~3-4, bleeding glyph
  // strokes into the transparent background. Then the `tex.a < 0.04` discard
  // in the fragment shader almost never fires, and hundreds of overlapping
  // half-alpha quads (depthWrite:false) composite into the white blob instead
  // of distinct glyphs. Bilinear sampling of the base level keeps glyph edges
  // crisp and the background truly transparent.
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ---------------------------------------------------------------------------
// Surface sampling (glyphs live ON the surface, never inside the volume).
// ---------------------------------------------------------------------------

interface GlyphSample {
  pos: THREE.Vector3;
  normal: THREE.Vector3;
}

function sampleSphere(count: number, r: number, center: THREE.Vector3, rng: () => number): GlyphSample[] {
  const out: GlyphSample[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i + rng() * 0.2;
    const n = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
    out.push({ pos: center.clone().addScaledVector(n, r), normal: n });
  }
  return out;
}

function basisFor(dir: THREE.Vector3): { u: THREE.Vector3; v: THREE.Vector3 } {
  const helper = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(dir, helper).normalize();
  const v = new THREE.Vector3().crossVectors(dir, u).normalize();
  return { u, v };
}

function sampleCapsule(
  count: number,
  r: number,
  a: THREE.Vector3,
  b: THREE.Vector3,
  rng: () => number,
): GlyphSample[] {
  const out: GlyphSample[] = [];
  const axis = new THREE.Vector3().subVectors(b, a);
  const len = axis.length();
  axis.normalize();
  const { u, v } = basisFor(axis);
  const sideCount = Math.round(count * 0.72);
  for (let i = 0; i < sideCount; i++) {
    const t = rng();
    const phi = rng() * Math.PI * 2;
    const n = u.clone().multiplyScalar(Math.cos(phi)).addScaledVector(v, Math.sin(phi));
    const p = a.clone().addScaledVector(axis, t * len).addScaledVector(n, r);
    out.push({ pos: p, normal: n });
  }
  for (let i = sideCount; i < count; i++) {
    const end = rng() < 0.5 ? a : b;
    const capDir = end === a ? axis.clone().negate() : axis.clone();
    // Uniform hemisphere around capDir.
    const d = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize();
    if (d.dot(capDir) < 0) d.negate();
    out.push({ pos: end.clone().addScaledVector(d, r), normal: d });
  }
  return out;
}

function sampleBox(
  count: number,
  center: THREE.Vector3,
  size: THREE.Vector3,
  rng: () => number,
): GlyphSample[] {
  const out: GlyphSample[] = [];
  const faces: Array<{ n: THREE.Vector3; area: number }> = [
    { n: new THREE.Vector3(0, 0, 1), area: size.x * size.y },
    { n: new THREE.Vector3(0, 0, -1), area: size.x * size.y },
    { n: new THREE.Vector3(1, 0, 0), area: size.z * size.y },
    { n: new THREE.Vector3(-1, 0, 0), area: size.z * size.y },
    { n: new THREE.Vector3(0, 1, 0), area: size.x * size.z },
    { n: new THREE.Vector3(0, -1, 0), area: size.x * size.z },
  ];
  const total = faces.reduce((s, f) => s + f.area, 0);
  for (let i = 0; i < count; i++) {
    let pick = rng() * total;
    let face = faces[0]!;
    for (const f of faces) {
      pick -= f.area;
      if (pick <= 0) {
        face = f;
        break;
      }
    }
    const p = center.clone();
    const n = face.n;
    if (Math.abs(n.z) > 0.5) {
      p.x += (rng() - 0.5) * size.x;
      p.y += (rng() - 0.5) * size.y;
      p.z += Math.sign(n.z) * size.z * 0.5;
    } else if (Math.abs(n.x) > 0.5) {
      p.z += (rng() - 0.5) * size.z;
      p.y += (rng() - 0.5) * size.y;
      p.x += Math.sign(n.x) * size.x * 0.5;
    } else {
      p.x += (rng() - 0.5) * size.x;
      p.z += (rng() - 0.5) * size.z;
      p.y += Math.sign(n.y) * size.y * 0.5;
    }
    out.push({ pos: p, normal: n.clone() });
  }
  return out;
}

function sampleTorus(tSteps: number, pSteps: number, R: number, r: number): GlyphSample[] {
  const out: GlyphSample[] = [];
  for (let i = 0; i < tSteps; i++) {
    const theta = (i / tSteps) * Math.PI * 2;
    for (let j = 0; j < pSteps; j++) {
      const phi = (j / pSteps) * Math.PI * 2;
      const n = new THREE.Vector3(
        Math.cos(phi) * Math.cos(theta),
        Math.cos(phi) * Math.sin(theta),
        Math.sin(phi),
      );
      const p = new THREE.Vector3(
        (R + r * Math.cos(phi)) * Math.cos(theta),
        (R + r * Math.cos(phi)) * Math.sin(theta),
        r * Math.sin(phi),
      );
      out.push({ pos: p, normal: n });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Glyph billboard material. Per-instance world normal -> density ramp glyph,
// so the figure shades as it turns. `instanceMatrix` is auto-declared by
// three.js for InstancedMesh — do NOT redeclare it here.
// ---------------------------------------------------------------------------

const GLYPH_VERT = /* glsl */ `
  attribute float aJitter;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  uniform vec3 uLightDir;
  uniform float uSize;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vGlyph;
  void main() {
    vUv = uv;
    vColor = aColor;
    vec4 wp4 = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 wn = normalize(mat3(modelMatrix) * (mat3(instanceMatrix) * aNormal));
    float lum = 0.10 + 0.90 * max(dot(wn, normalize(uLightDir)), 0.0);
    float glyph = clamp(floor(lum * 63.999 + (aJitter - 0.5) * 7.0), 0.0, 63.0);
    // BACKFACE CULLING (root-cause fix for the white blob): glyphs whose
    // surface normal faces away from the camera fade to the space glyph
    // (index 0, discarded in the fragment shader). Without this, far-side
    // glyphs render through the head via depthWrite:false and the two
    // hemispheres composite into a solid mass.
    vec3 viewDir = normalize(cameraPosition - wp4.xyz);
    float facing = dot(wn, viewDir);
    float vis = smoothstep(-0.05, 0.25, facing);
    vGlyph = mix(0.0, glyph, vis);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 wp = wp4.xyz + (right * position.x + up * position.y) * uSize;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const GLYPH_FRAG = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vGlyph;

  // Ordered Bayer 4x4 threshold — the dither that breaks dot edges into a
  // deliberate halftone pattern instead of a soft gradient.
  float bayer2x2(vec2 q) {
    return mod(q.x * 2.0 + q.y * 3.0, 4.0);
  }
  float bayer4(vec2 p) {
    vec2 lo = mod(p, 2.0);
    vec2 hi = mod(floor(p * 0.5), 2.0);
    return (4.0 * bayer2x2(lo) + bayer2x2(hi) + 0.5) / 16.0;
  }

  void main() {
    if (vGlyph < 0.5) discard;
    float density = clamp(vGlyph / 63.0, 0.0, 1.0);
    // DOT-MATRIX: each glyph cell becomes a single dot whose radius grows
    // with the cell's shading density (area-proportional), so the figure
    // reads as a halftone print — the blue bust panel in Bercev's
    // "dither / noise / ascii" reference — not a soft glow.
    vec2 cell = vUv - 0.5;
    float dist = length(cell) * 2.0;
    float radius = 0.16 + 0.86 * sqrt(density);
    float dither = bayer4(gl_FragCoord.xy * 0.5);
    float dot = 1.0 - smoothstep(
      radius - 0.30,
      radius + 0.03,
      dist + (dither - 0.5) * 0.34
    );
    if (dot < 0.03) discard;
    // Keep a whisper of the glyph texture inside the dot so the figure
    // still reads as ASCII at reading distance.
    float gx = mod(vGlyph, 8.0);
    float gy = floor(vGlyph / 8.0);
    vec2 cellUv = vec2((gx + vUv.x) / 8.0, (7.0 - gy + vUv.y) / 8.0);
    float texA = texture2D(uAtlas, cellUv).a;
    float a = dot * mix(0.55, 1.0, texA) * uOpacity;
    vec3 col = vColor * (0.45 + 0.85 * density);
    gl_FragColor = vec4(col, a);
  }
`;

function createGlyphMaterial(
  atlas: THREE.Texture,
  size: number,
  opacity: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: atlas },
      uLightDir: { value: new THREE.Vector3(-0.5, 0.75, 0.6).normalize() },
      uSize: { value: size },
      uOpacity: { value: opacity },
    },
    vertexShader: GLYPH_VERT,
    fragmentShader: GLYPH_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
}

function makeGlyphCloud(
  samples: GlyphSample[],
  material: THREE.Material,
  color: THREE.Color,
  rng: () => number,
): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, material, samples.length);
  const m = new THREE.Matrix4();
  const jitter = new Float32Array(samples.length);
  const normals = new Float32Array(samples.length * 3);
  const colors = new Float32Array(samples.length * 3);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    m.makeTranslation(s.pos.x, s.pos.y, s.pos.z);
    mesh.setMatrixAt(i, m);
    jitter[i] = rng();
    normals[i * 3] = s.normal.x;
    normals[i * 3 + 1] = s.normal.y;
    normals[i * 3 + 2] = s.normal.z;
    const b = 0.9 + rng() * 0.2;
    colors[i * 3] = Math.min(1, color.r * b);
    colors[i * 3 + 1] = Math.min(1, color.g * b);
    colors[i * 3 + 2] = Math.min(1, color.b * b);
  }
  geo.setAttribute("aJitter", new THREE.InstancedBufferAttribute(jitter, 1));
  geo.setAttribute("aNormal", new THREE.InstancedBufferAttribute(normals, 3));
  geo.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------------------
// Stage rigs.
// ---------------------------------------------------------------------------

interface BustRig {
  group: THREE.Group;
  head: THREE.Group;
}

/** Monumental neck-up bust: head + neck + shoulders. Scaled up by the caller. */
function buildBust(rng: () => number, material: THREE.Material): BustRig {
  const group = new THREE.Group();
  const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  // Shoulders / upper chest slab — sparse constellation sampling.
  group.add(
    makeGlyphCloud(sampleBox(130, V3(0, -0.22, 0), V3(1.45, 0.42, 0.62), rng), material, BODY_COLOR, rng),
  );
  // Neck.
  group.add(
    makeGlyphCloud(sampleCapsule(55, 0.15, V3(0, -0.08, 0), V3(0, 0.14, 0), rng), material, BODY_COLOR, rng),
  );
  // Head in its own pivoted group so it can WATCH the cursor + blink.
  const head = new THREE.Group();
  head.position.set(0, 0.1, 0);
  head.add(makeGlyphCloud(sampleSphere(160, 0.38, V3(0, 0.3, 0), rng), material, BODY_COLOR, rng));
  group.add(head);
  return { group, head };
}

interface WorkerRig {
  group: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
}

/**
 * Full seated figure at an ASCII workstation. Faces +Z (toward the camera).
 * Arms are shoulder-pivot groups built already bent toward the keyboard; the
 * typing loop oscillates them out of phase.
 */
function buildWorker(rng: () => number, material: THREE.Material): WorkerRig {
  const group = new THREE.Group();
  const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  // Torso + pelvis.
  group.add(
    makeGlyphCloud(sampleCapsule(330, 0.3, V3(0, 0.95, 0), V3(0, 1.62, 0), rng), material, BODY_COLOR, rng),
  );
  group.add(makeGlyphCloud(sampleSphere(110, 0.27, V3(0, 0.92, 0), rng), material, BODY_COLOR, rng));

  // Seated legs: thighs forward, shins down, feet on the floor.
  for (const sx of [-1, 1]) {
    group.add(
      makeGlyphCloud(
        sampleCapsule(130, 0.13, V3(sx * 0.15, 0.95, 0.06), V3(sx * 0.15, 0.95, 0.5), rng),
        material,
        BODY_COLOR,
        rng,
      ),
    );
    group.add(
      makeGlyphCloud(
        sampleCapsule(110, 0.11, V3(sx * 0.15, 0.93, 0.5), V3(sx * 0.15, 0.14, 0.5), rng),
        material,
        BODY_COLOR,
        rng,
      ),
    );
    group.add(
      makeGlyphCloud(
        sampleBox(42, V3(sx * 0.15, 0.07, 0.64), V3(0.18, 0.14, 0.42), rng),
        material,
        BODY_COLOR,
        rng,
      ),
    );
  }

  // Arms: shoulder groups, pre-bent toward the keyboard.
  const mkArm = (sx: -1 | 1): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx * 0.4, 1.52, 0.02);
    g.add(
      makeGlyphCloud(
        sampleCapsule(110, 0.105, V3(0, 0, 0), V3(sx * 0.02, -0.38, 0.24), rng),
        material,
        BODY_COLOR,
        rng,
      ),
    );
    g.add(
      makeGlyphCloud(
        sampleCapsule(90, 0.09, V3(sx * 0.02, -0.38, 0.24), V3(sx * -0.06, -0.52, 0.5), rng),
        material,
        BODY_COLOR,
        rng,
      ),
    );
    g.add(
      makeGlyphCloud(sampleSphere(52, 0.105, V3(sx * -0.06, -0.53, 0.54), rng), material, BODY_COLOR, rng),
    );
    group.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  // Head on a neck pivot.
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.02);
  head.add(makeGlyphCloud(sampleSphere(220, 0.26, V3(0, 0.26, 0.02), rng), material, BODY_COLOR, rng));
  group.add(head);

  // Desk: top slab + legs.
  group.add(makeGlyphCloud(sampleBox(170, V3(0, 0.9, 0.8), V3(1.75, 0.09, 0.8), rng), material, BODY_COLOR, rng));
  for (const sx of [-1, 1]) {
    group.add(
      makeGlyphCloud(sampleBox(42, V3(sx * 0.78, 0.43, 0.98), V3(0.09, 0.86, 0.09), rng), material, BODY_COLOR, rng),
    );
  }
  // Monitor: stand + shell + bright screen face.
  group.add(makeGlyphCloud(sampleBox(56, V3(0, 1.0, 0.94), V3(0.1, 0.12, 0.1), rng), material, BODY_COLOR, rng));
  group.add(makeGlyphCloud(sampleBox(130, V3(0, 1.42, 0.97), V3(0.9, 0.58, 0.09), rng), material, BODY_COLOR, rng));
  group.add(
    makeGlyphCloud(sampleBox(70, V3(0, 1.42, 0.92), V3(0.8, 0.48, 0.03), rng), material, SCREEN_COLOR, rng),
  );
  // Keyboard.
  group.add(makeGlyphCloud(sampleBox(62, V3(0, 0.975, 0.56), V3(0.72, 0.05, 0.26), rng), material, BODY_COLOR, rng));
  // Chair: seat + back.
  group.add(makeGlyphCloud(sampleBox(80, V3(0, 0.86, -0.12), V3(0.62, 0.1, 0.55), rng), material, BODY_COLOR, rng));
  group.add(makeGlyphCloud(sampleBox(80, V3(0, 1.22, -0.4), V3(0.56, 0.62, 0.1), rng), material, BODY_COLOR, rng));

  return { group, head, armL, armR };
}

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------

export function AsciiPerson3D(): React.JSX.Element | null {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [asciiActive, setAsciiActive] = useState(false);
  const [wide, setWide] = useState(false);
  const modeRef = useRef<StageMode>("bust");
  const nodRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0, has: false });

  // Gate on ASCII mode + desktop widths (same contract as the 2D version).
  useEffect(() => {
    const root = document.documentElement;
    const syncAscii = () => setAsciiActive(root.getAttribute("data-ascii") === "active");
    syncAscii();
    const mo = new MutationObserver(syncAscii);
    mo.observe(root, { attributes: true, attributeFilter: ["data-ascii"] });

    const mq = window.matchMedia("(min-width: 900px)");
    const syncWide = () => setWide(mq.matches);
    syncWide();
    mq.addEventListener("change", syncWide);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", syncWide);
    };
  }, []);

  // Track the most-visible section -> stage mode (+ nod on contact).
  useEffect(() => {
    const ratios = new Map<string, number>();
    const apply = () => {
      let bestId: string | null = null;
      let bestRatio = 0;
      for (const [id, ratio] of ratios) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (bestId) {
        modeRef.current = SECTION_MODE[bestId] ?? "bust";
        nodRef.current = bestId === "contact";
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set((e.target as HTMLElement).id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        apply();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  // Pointer tracking (NDC) for the head-watch behavior.
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      pointerRef.current.has = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const visible = asciiActive && wide;

  // Main three.js scene.
  useEffect(() => {
    if (!visible) return;
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const rng = mulberry32(0xA5C11);
    const blinkRng = mulberry32(0xb11c);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 60);
    camera.position.set(0, 1.72, 7.4);
    camera.lookAt(0, 1.62, 0);

    const atlas = buildAtlasTexture(buildAtlasGlyphs());
    // Rebuild once webfonts arrive so glyphs use JetBrains Mono when available.
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        const fresh = buildAtlasTexture(buildAtlasGlyphs());
        atlas.image = fresh.image;
        atlas.needsUpdate = true;
        fresh.dispose();
      });
    }

    // Independent materials per rig so the bust/work crossfade can damp
    // opacities separately.
    // Bust rig: bigger scale, smaller glyphs, sparse counts — a large airy
    // constellation head, not a solid mass. Glyph quads are world-space so
    // they stay small while positions spread with the group scale.
    const bustMat = createGlyphMaterial(atlas, 0.065, 0);
    const workMat = createGlyphMaterial(atlas, 0.052, 0);
    const donutMat = createGlyphMaterial(atlas, 0.07, 0.55);

    // ---- Bust rig: monumental, center-right, behind content ----
    const bust = buildBust(rng, bustMat);
    const BUST_SCALE = 2.3;
    bust.group.scale.setScalar(BUST_SCALE);
    const BUST_BASE = new THREE.Vector3(1.8, 1.1, -3.2);
    bust.group.position.copy(BUST_BASE);
    scene.add(bust.group);

    // ---- Worker rig: seated at the desk, right side ----
    const worker = buildWorker(rng, workMat);
    worker.group.scale.setScalar(0.95);
    const WORKER_BASE = new THREE.Vector3(1.5, 0, -0.9);
    worker.group.position.copy(WORKER_BASE);
    scene.add(worker.group);

    // ---- Background donut: parametric torus, tumbling slowly ----
    const donut = new THREE.Group();
    const donutMesh = makeGlyphCloud(sampleTorus(44, 26, 1.05, 0.4), donutMat, DONUT_COLOR, rng);
    donut.add(donutMesh);
    donut.position.set(-1.9, 2.5, -2.4);
    donut.scale.setScalar(0.85);
    scene.add(donut);

    // ---- Resize ----
    const resize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer!.setPixelRatio(dpr);
      renderer!.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // ---- Animation ----
    let raf = 0;
    const clock = new THREE.Clock();
    const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    const damp = (cur: number, target: number, lambda: number, dt: number) =>
      cur + (target - cur) * (1 - Math.exp(-lambda * dt));

    let modeMix = 1; // 1 = bust fully visible, 0 = worker fully visible
    let bustYaw = 0;
    let workerYaw = 0;
    let nextBlink = 2.5;
    let blinkUntil = -1;

    const applyHeadWatch = (
      head: THREE.Group,
      groupYaw: number,
      t: number,
      sdt: number,
      nod: boolean,
    ) => {
      const px = pointerRef.current;
      let targetYaw = 0;
      let targetPitch = 0;
      if (px.has && !reducedMotion) {
        targetYaw = THREE.MathUtils.clamp(px.x * 0.8, -0.95, 0.95);
        targetPitch = THREE.MathUtils.clamp(-px.y * 0.5, -0.5, 0.5);
        // Micro-movements: the head is never perfectly still, and slowly
        // scans the room on a ~18s cycle so the bust feels alive.
        targetYaw +=
          Math.sin(t * 0.35) * 0.22 + Math.sin(t * 0.9) * 0.06 + Math.sin(t * 2.17) * 0.03;
        targetPitch +=
          Math.sin(t * 0.27 + 1.1) * 0.08 + Math.sin(t * 1.3 + 0.7) * 0.04;
      }
      if (nod && !reducedMotion) targetPitch += Math.sin(t * 2.6) * 0.14;
      const localYaw = THREE.MathUtils.clamp(wrapPi(targetYaw - wrapPi(groupYaw)), -1.15, 1.15);
      head.rotation.y = damp(head.rotation.y, localYaw, 10, sdt);
      head.rotation.x = damp(head.rotation.x, THREE.MathUtils.clamp(targetPitch, -0.55, 0.55), 10, sdt);
    };

    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      // Under reduced motion every joint snaps to its target (no animation).
      const sdt = reducedMotion ? 1000 : dt;

      // Crossfade between stage modes (smooth, never a jarring cut).
      modeMix = damp(modeMix, modeRef.current === "bust" ? 1 : 0, 3.5, sdt);
      (bustMat.uniforms.uOpacity as THREE.IUniform).value = 0.25 * modeMix;
      (workMat.uniforms.uOpacity as THREE.IUniform).value = 0.85 * (1 - modeMix);

      if (!reducedMotion) {
        // The bust floats: layered drift on all three axes at different
        // frequencies so the motion feels organic, never mechanical.
        bust.group.position.set(
          BUST_BASE.x + Math.sin(t * 0.5) * 0.12 + Math.sin(t * 1.63 + 1.0) * 0.045,
          BUST_BASE.y + Math.sin(t * 1.1) * 0.055 + Math.sin(t * 2.31 + 0.5) * 0.016,
          BUST_BASE.z + Math.cos(t * 0.37) * 0.12 + Math.sin(t * 0.83) * 0.05,
        );
        // Gentle sway (roll + tilt) layered on top of the drift.
        bust.group.rotation.z = Math.sin(t * 0.7) * 0.045 + Math.sin(t * 1.9) * 0.015;
        bust.group.rotation.x = Math.sin(t * 0.52 + 2.0) * 0.03;
        // Slow scale pulse — the bust "breathes" in size as well as position.
        bust.group.scale.setScalar(
          BUST_SCALE * (1 + Math.sin(t * 1.3) * 0.022 + Math.sin(t * 3.1) * 0.008),
        );
        // Worker bobs with the typing rhythm.
        worker.group.position.y =
          WORKER_BASE.y + Math.sin(t * 1.1 + 1.3) * 0.012 + Math.sin(t * Math.PI * 2 * 4.75) * 0.006;
        // Bust turntable (lively but never dizzying); worker settles to face the camera.
        bustYaw += dt * 0.24;
        workerYaw = damp(workerYaw, 0, 4, sdt);
        // Donut tumbles behind everything.
        donut.rotation.x = t * 0.32;
        donut.rotation.y = t * 0.21;
        // Seamless typing loop: arms pump out of phase at ~4.75 Hz.
        const ph = t * Math.PI * 2 * 4.75;
        worker.armL.rotation.x = Math.sin(ph) * 0.055;
        worker.armR.rotation.x = Math.sin(ph + Math.PI) * 0.055;
        worker.armL.rotation.z = Math.sin(ph * 0.5) * 0.02;
        worker.armR.rotation.z = Math.sin(ph * 0.5 + 1) * 0.02;
        // Periodic blink schedule.
        if (t > nextBlink) {
          blinkUntil = t + 0.14;
          nextBlink = t + 2.2 + blinkRng() * 3.5;
        }
      }
      bust.group.rotation.y = bustYaw;
      worker.group.rotation.y = workerYaw;

      // Blink: quick vertical squash of the head (both rigs).
      const blinkK =
        !reducedMotion && t < blinkUntil
          ? Math.sin(((t - (blinkUntil - 0.14)) / 0.14) * Math.PI)
          : 0;
      bust.head.scale.y = 1 - 0.18 * blinkK;
      worker.head.scale.y = 1 - 0.18 * blinkK;

      // Both heads watch the cursor (compensated for their own group yaw).
      applyHeadWatch(bust.head, bustYaw, t, sdt, false);
      applyHeadWatch(worker.head, workerYaw, t, sdt, nodRef.current);

      renderer!.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      scene.traverse((obj) => {
        const mesh = obj as THREE.InstancedMesh;
        if (mesh.isInstancedMesh) {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
      });
      atlas.dispose();
      renderer!.dispose();
      mount.removeChild(renderer!.domElement);
      renderer = null;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      data-ascii-person-3d
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2, // above the journey canvas (1), below content (5)
        pointerEvents: "none",
      }}
    />
  );
}
