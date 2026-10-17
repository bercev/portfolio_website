"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";

/**
 * AsciiPerson3D — a true 3D ASCII humanoid built from instanced glyph
 * billboards arranged in 3D space (Effulgence-RPG style: text symbols as
 * geometry, not post-processing).
 *
 * Why this reads as a person (and the old point-cloud didn't): glyphs are
 * sampled on the SURFACE of articulated capsule/sphere limbs — never a volume
 * fill — and each glyph is chosen per-frame from a density ramp by its
 * world-space normal vs. a key light, so the form shades like classic ASCII
 * art as it turns. Limbs are separate parts with real gaps between them.
 *
 * Behaviors:
 * - Slow turntable rotation of the whole body.
 * - The head WATCHES the cursor: yaw/pitch track the pointer in world space
 *   (compensated for body spin, clamped like a real neck).
 * - Arms pose per scroll chapter (typing / welcome / reading / building /
 *   celebrate / waving), cross-lerped; the waving arm oscillates.
 * - A parametric ASCII donut tumbles slowly behind the person.
 * - All motion is gated off under prefers-reduced-motion.
 */

type Pose3D = "typing" | "welcome" | "reading" | "building" | "celebrate" | "waving";

const SECTION_POSE: Record<string, Pose3D> = {
  home: "typing",
  about: "welcome",
  publications: "reading",
  experience: "building",
  projects: "building",
  skills: "celebrate",
  contact: "waving",
};

const SECTION_IDS = ["home", "about", "publications", "experience", "projects", "skills", "contact"];

const BODY_COLOR = new THREE.Color("#2fd8ff"); // phosphor cyan
const DONUT_COLOR = new THREE.Color("#a87f4a"); // dim amber bronze

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
  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.shadowBlur = S * 0.06;
  for (let g = 0; g < 64; g++) {
    const col = g % 8;
    const row = Math.floor(g / 8);
    ctx.fillText(glyphs[g]!, col * S + S / 2, row * S + S / 2 + S * 0.03);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
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
    vGlyph = clamp(floor(lum * 63.999 + (aJitter - 0.5) * 7.0), 0.0, 63.0);
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
  void main() {
    float gx = mod(vGlyph, 8.0);
    float gy = floor(vGlyph / 8.0);
    // CanvasTexture flipY=true: v=1 is the canvas top row.
    vec2 cellUv = vec2((gx + vUv.x) / 8.0, (7.0 - gy + vUv.y) / 8.0);
    vec4 tex = texture2D(uAtlas, cellUv);
    if (tex.a < 0.04) discard;
    gl_FragColor = vec4(vColor * tex.rgb, tex.a * uOpacity);
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
// Poses: shoulder Euler targets [x, y, z]. Arms hang along -Y; x=-PI/2 points
// an arm straight forward (+Z), z=±PI/2 points it out to the side.
// ---------------------------------------------------------------------------

interface ArmPose {
  x: number;
  y: number;
  z: number;
}

const ARM_POSES: Record<Pose3D, { armL: ArmPose; armR: ArmPose; wave: boolean }> = {
  typing: { armL: { x: -1.15, y: 0, z: -0.28 }, armR: { x: -1.15, y: 0, z: 0.28 }, wave: false },
  welcome: { armL: { x: -0.15, y: 0, z: -1.32 }, armR: { x: -0.15, y: 0, z: 1.32 }, wave: false },
  reading: { armL: { x: -0.82, y: 0, z: -0.38 }, armR: { x: -0.82, y: 0, z: 0.38 }, wave: false },
  building: { armL: { x: -0.25, y: 0, z: -0.22 }, armR: { x: -2.72, y: 0, z: 0.32 }, wave: false },
  celebrate: { armL: { x: -0.25, y: 0, z: -2.35 }, armR: { x: -0.25, y: 0, z: 2.35 }, wave: false },
  waving: { armL: { x: -0.25, y: 0, z: -0.22 }, armR: { x: -2.85, y: 0, z: 0.28 }, wave: true },
};

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------

export function AsciiPerson3D(): React.JSX.Element | null {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [asciiActive, setAsciiActive] = useState(false);
  const [wide, setWide] = useState(false);
  const poseRef = useRef<Pose3D>("typing");
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

  // Track the most-visible section -> pose.
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
      if (bestId) poseRef.current = SECTION_POSE[bestId] ?? "typing";
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
    const camera = new THREE.PerspectiveCamera(30, 460 / 600, 0.1, 60);
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

    const personMat = createGlyphMaterial(atlas, 0.085, 0.95);
    const donutMat = createGlyphMaterial(atlas, 0.105, 0.7);

    // ---- Person hierarchy ----
    const person = new THREE.Group();
    scene.add(person);

    const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    // Torso + pelvis + head base.
    person.add(makeGlyphCloud(sampleCapsule(480, 0.34, V3(0, 1.45, 0), V3(0, 2.55, 0), rng), personMat, BODY_COLOR, rng));
    person.add(makeGlyphCloud(sampleSphere(120, 0.3, V3(0, 1.38, 0), rng), personMat, BODY_COLOR, rng));

    // Legs (static).
    for (const sx of [-1, 1]) {
      person.add(
        makeGlyphCloud(
          sampleCapsule(200, 0.145, V3(sx * 0.17, 1.3, 0), V3(sx * 0.17, 0.14, 0), rng),
          personMat,
          BODY_COLOR,
          rng,
        ),
      );
      person.add(
        makeGlyphCloud(
          sampleBox(50, V3(sx * 0.17, 0.07, 0.1), V3(0.2, 0.14, 0.44), rng),
          personMat,
          BODY_COLOR,
          rng,
        ),
      );
    }

    // Arms: shoulder groups so poses rotate the whole limb.
    const armGroups: { group: THREE.Group; side: -1 | 1 }[] = [];
    for (const sx of [-1, 1] as const) {
      const shoulder = new THREE.Group();
      shoulder.position.set(sx * 0.5, 2.4, 0);
      const upper = makeGlyphCloud(
        sampleCapsule(150, 0.115, V3(0, 0, 0), V3(0, -0.55, 0), rng),
        personMat,
        BODY_COLOR,
        rng,
      );
      const fore = makeGlyphCloud(
        sampleCapsule(120, 0.1, V3(0, -0.55, 0), V3(0, -0.92, 0), rng),
        personMat,
        BODY_COLOR,
        rng,
      );
      const hand = makeGlyphCloud(sampleSphere(60, 0.13, V3(0, -1.0, 0), rng), personMat, BODY_COLOR, rng);
      shoulder.add(upper, fore, hand);
      person.add(shoulder);
      armGroups.push({ group: shoulder, side: sx });
    }

    // Head: its own group pivoted at the neck so it can WATCH the cursor.
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.58, 0);
    const headMesh = makeGlyphCloud(sampleSphere(240, 0.3, V3(0, 0.34, 0), rng), personMat, BODY_COLOR, rng);
    // Simple "face" hint: two slightly brighter eye dots are overkill in glyph
    // space; the shaded sphere reads as a head on its own.
    headGroup.add(headMesh);
    person.add(headGroup);

    // ---- Background donut: parametric torus, tumbling slowly ----
    const donut = new THREE.Group();
    const donutMesh = makeGlyphCloud(sampleTorus(44, 26, 1.05, 0.4), donutMat, DONUT_COLOR, rng);
    donut.add(donutMesh);
    donut.position.set(-1.7, 2.35, -2.0);
    donut.scale.setScalar(0.85);
    scene.add(donut);

    // ---- Resize ----
    const resize = () => {
      const w = mount.clientWidth || 460;
      const h = mount.clientHeight || 600;
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
    let bodyYaw = 0;
    const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    const damp = (cur: number, target: number, lambda: number, dt: number) =>
      cur + (target - cur) * (1 - Math.exp(-lambda * dt));

    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      // Under reduced motion every joint snaps to its target (no animation).
      const sdt = reducedMotion ? 1000 : dt;

      if (!reducedMotion) {
        bodyYaw += dt * 0.22; // slow turntable
        person.position.y = Math.sin(t * 1.4) * 0.03;
        donut.rotation.x = t * 0.32;
        donut.rotation.y = t * 0.21;
      }
      person.rotation.y = bodyYaw;

      // Head watches the cursor (world-space, clamped like a real neck).
      const px = pointerRef.current;
      const targetYaw = px.has && !reducedMotion ? THREE.MathUtils.clamp(px.x * 0.8, -0.95, 0.95) : 0;
      const targetPitch = px.has && !reducedMotion ? THREE.MathUtils.clamp(-px.y * 0.5, -0.5, 0.5) : 0;
      const bodyWrapped = wrapPi(bodyYaw);
      const localYaw = THREE.MathUtils.clamp(wrapPi(targetYaw - bodyWrapped), -1.15, 1.15);
      headGroup.rotation.y = damp(headGroup.rotation.y, localYaw, 10, sdt);
      headGroup.rotation.x = damp(headGroup.rotation.x, targetPitch, 10, sdt);

      // Arm poses per chapter.
      const pose = ARM_POSES[poseRef.current];
      for (const { group, side } of armGroups) {
        const target = side < 0 ? pose.armL : pose.armR;
        group.rotation.x = damp(group.rotation.x, target.x, 7, sdt);
        group.rotation.y = damp(group.rotation.y, target.y, 7, sdt);
        let z = target.z;
        if (pose.wave && side > 0 && !reducedMotion) z += Math.sin(t * 6.5) * 0.32;
        group.rotation.z = damp(group.rotation.z, z, 7, sdt);
      }

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
        right: "max(2.5vw, 20px)",
        top: "50%",
        transform: "translateY(-50%)",
        height: "min(62vh, 600px)",
        width: "auto",
        aspectRatio: "460 / 600",
        zIndex: 4, // above the journey canvas (2), below the content frost (5)
        pointerEvents: "none",
        opacity: 0.95,
        // Soft left-edge fade so the figure never hard-overlaps body copy.
        WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 18%, black 100%)",
        maskImage: "linear-gradient(90deg, transparent 0%, black 18%, black 100%)",
      }}
    />
  );
}
