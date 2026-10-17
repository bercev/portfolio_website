import * as THREE from "three";

/**
 * Pure procedural ASCII art — no 3D scene conversion.
 * Generates Braille patterns directly from math: fBm noise, sine waves,
 * scroll-reactive morphing. Each chapter is a different procedural world.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uScroll;      // 0..1 scroll progress
  uniform vec3 uColorA;       // Primary phosphor
  uniform vec3 uColorB;       // Secondary phosphor
  uniform vec2 uCellSize;     // Braille cell size in pixels
  uniform vec2 uMouse;        // Cursor in pixels, y-up (GL space). Far offscreen = no lens.
  uniform float uMouseVel;    // 0..1 normalized cursor velocity
  uniform float uBurst;       // Chapter-transition scramble burst, 0..1 (decays)
  uniform float uMotionOK;    // 0 under prefers-reduced-motion (kills lens/scramble)

  varying vec2 vUv;

  // Hash for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  // Ordered Bayer dithering (4x4 via 2x2 trick) — organic texture on gradients.
  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x * 0.5 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) {
    return bayer2(a * 0.5) * 0.25 + bayer2(a);
  }

  void main() {
    vec2 uv = vUv;
    vec2 px = uv * uResolution;

    // Scroll-reactive: different procedural worlds per chapter
    float chapter = uScroll * 7.0; // 0..7
    float t = uTime * 0.3;

    // Scroll-reactive density: cells breathe subtly per chapter (+/-14%).
    float chapPulse = 1.0 + 0.14 * sin(chapter * 3.14159265);
    vec2 effCell = uCellSize * chapPulse;

    // Mouse lens: cells near the cursor subdivide (sharper detail where you point).
    float md = distance(px, uMouse);
    float lens = (1.0 - smoothstep(90.0, 170.0, md)) * uMotionOK;
    effCell *= mix(1.0, 0.55, lens);

    // Braille cell (from effective size, so the lens truly sharpens detail)
    vec2 cellIdx = floor(px / effCell);
    vec2 cellUv = fract(px / effCell);

    // Base pattern: flowing fBm
    vec2 p = cellIdx * 0.08;
    p.x += t * 0.5;
    p.y += sin(t * 0.3 + cellIdx.x * 0.02) * 0.5;
    float n = fbm(p + chapter * 10.0);

    // Sine wave interference (changes per chapter)
    float waves = sin(cellIdx.x * 0.05 + t * 2.0 + chapter) *
                  sin(cellIdx.y * 0.04 - t * 1.5 + chapter * 2.0);

    // Combine: noise + waves, modulated by chapter
    float field = n * 0.7 + waves * 0.3;
    field += 0.2 * sin(uScroll * 20.0 + cellIdx.x * 0.01); // Scroll ripple

    // Bayer-ordered threshold: dithers dot density on smooth gradients.
    // LOWER threshold = more dots = denser, more detailed art.
    float bayer = bayer4(px);
    float threshold = 0.38 + (bayer - 0.5) * 0.14;

    // Scramble ring at the lens edge: dots re-roll ~14x/sec, faster with velocity.
    // (Our "glyphs" are Braille dots, so re-rolling = random on/off flips.)
    float ring = smoothstep(90.0, 120.0, md) * (1.0 - smoothstep(150.0, 200.0, md));
    ring *= uMotionOK;
    float scrRate = 14.0 + uMouseVel * 26.0;
    float scrTick = floor(uTime * scrRate);
    float burstAmt = uBurst * uMotionOK;
    float scrambleMix = clamp(ring + burstAmt * 0.7, 0.0, 1.0);

    // Braille dots: 2x4 grid, threshold by field
    vec2 dotOffsets[8];
    dotOffsets[0] = vec2(0.25, 0.125); dotOffsets[1] = vec2(0.25, 0.375);
    dotOffsets[2] = vec2(0.25, 0.625); dotOffsets[3] = vec2(0.25, 0.875);
    dotOffsets[4] = vec2(0.75, 0.125); dotOffsets[5] = vec2(0.75, 0.375);
    dotOffsets[6] = vec2(0.75, 0.625); dotOffsets[7] = vec2(0.75, 0.875);

    // Braille atlas lookup (16x16 grid, built in JS)
    // For now, render dots directly as circles (simpler, no atlas needed)
    vec2 brailleUv = cellUv;
    float alpha = 0.0;
    vec2 cellHashBase = fract(cellIdx * 0.173); // keep hash inputs small for precision
    for (int i = 0; i < 8; i++) {
      // Sample field at dot position with slight offset for variation
      vec2 dotCell = cellIdx + (dotOffsets[i] - 0.5) * 0.5;
      vec2 dp = dotCell * 0.08;
      dp.x += t * 0.5;
      float dotField = fbm(dp + chapter * 10.0) * 0.7 +
                       sin(dotCell.x * 0.05 + t * 2.0) * sin(dotCell.y * 0.04 - t * 1.5) * 0.3;
      float on = step(threshold, dotField);
      // Scramble: random re-roll for dots in the ring / during chapter burst
      float scr = step(hash(cellHashBase * 7.13 + vec2(float(i) * 1.31, scrTick * 0.717)), 0.5);
      on = mix(on, scr, scrambleMix);
      if (on > 0.5) {
        vec2 dotPos = dotOffsets[i];
        float d = length((brailleUv - dotPos) * vec2(1.0, 2.0)); // Elliptical for cell aspect
        alpha = max(alpha, smoothstep(0.18, 0.12, d));
      }
    }

    // Color: lerp between phosphors by field + chapter
    // BRIGHTER for more visual impact.
    vec3 col = mix(uColorA, uColorB, smoothstep(0.3, 0.7, field));
    // Color-the-type: subtle per-cell hue variation from the field itself.
    // Stays inside the phosphor families — tint, never rainbow.
    float hw = sin(field * 12.566 + chapter * 1.7);
    col *= vec3(1.0 + 0.07 * hw, 1.0 + 0.04 * sin(field * 12.566 + 2.1), 1.0 - 0.05 * hw);
    col *= 0.6 + 0.8 * smoothstep(0.3, 0.8, field);
    // Lens sharpen lift + chapter-burst glow pop
    col *= 1.0 + lens * 0.25 + burstAmt * 0.35;

    // Dark background
    vec3 bg = vec3(0.008, 0.012, 0.02);
    vec3 final = mix(bg, col, alpha * 0.95);

    gl_FragColor = vec4(final, 1.0);
  }
`;

export interface ProceduralAsciiOptions {
  cellSize?: { x: number; y: number };
  colorA?: THREE.Color;
  colorB?: THREE.Color;
  /** When true, phosphor colors follow the visitor's local time of day. */
  circadian?: boolean;
}

/** Phosphor palettes keyed to time of day — subtle, never announced.
 *  All keys stay inside the two phosphor hue families (cyan / amber);
 *  night is dim amber phosphor, never red. */
const CIRCADIAN_KEYS: ReadonlyArray<{
  readonly hour: number;
  readonly colorA: readonly [number, number, number];
  readonly colorB: readonly [number, number, number];
}> = [
  { hour: 0, colorA: [0.85, 0.55, 0.22], colorB: [0.38, 0.2, 0.09] }, // night: dim amber
  { hour: 5, colorA: [0.85, 0.55, 0.22], colorB: [0.38, 0.2, 0.09] },
  { hour: 7, colorA: [0.18, 0.85, 1.0], colorB: [1.0, 0.71, 0.28] }, // day: cyan
  { hour: 17, colorA: [0.18, 0.85, 1.0], colorB: [1.0, 0.71, 0.28] },
  { hour: 19, colorA: [1.0, 0.71, 0.28], colorB: [0.9, 0.4, 0.12] }, // evening: amber
  { hour: 23, colorA: [1.0, 0.71, 0.28], colorB: [0.9, 0.4, 0.12] },
  { hour: 24, colorA: [0.85, 0.55, 0.22], colorB: [0.38, 0.2, 0.09] },
];

/**
 * Phosphor colors for the current local time, lerped between keyframes.
 * Day (7–17): cyan. Evening (19–23): amber. Night (0–5): dim amber.
 */
export function getCircadianPalette(): {
  colorA: THREE.Color;
  colorB: THREE.Color;
} {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  let prev = CIRCADIAN_KEYS[0];
  let next = CIRCADIAN_KEYS[CIRCADIAN_KEYS.length - 1];
  for (let i = 0; i < CIRCADIAN_KEYS.length - 1; i++) {
    if (hour >= CIRCADIAN_KEYS[i].hour && hour <= CIRCADIAN_KEYS[i + 1].hour) {
      prev = CIRCADIAN_KEYS[i];
      next = CIRCADIAN_KEYS[i + 1];
      break;
    }
  }
  const span = Math.max(next.hour - prev.hour, 0.001);
  const t = THREE.MathUtils.clamp((hour - prev.hour) / span, 0, 1);
  const lerp3 = (
    a: readonly [number, number, number],
    b: readonly [number, number, number],
  ): THREE.Color =>
    new THREE.Color(
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    );
  return { colorA: lerp3(prev.colorA, next.colorA), colorB: lerp3(prev.colorB, next.colorB) };
}

export function createProceduralAscii(
  options: ProceduralAsciiOptions = {},
): THREE.ShaderMaterial {
  const {
    cellSize = { x: 10, y: 20 }, // Denser for more detail
    circadian = false,
  } = options;
  const base = circadian
    ? getCircadianPalette()
    : {
        colorA: options.colorA ?? new THREE.Color(0.25, 0.95, 0.95),
        colorB: options.colorB ?? new THREE.Color(1.0, 0.75, 0.25),
      };

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uColorA: { value: base.colorA.clone() },
      uColorB: { value: base.colorB.clone() },
      uCellSize: { value: new THREE.Vector2(cellSize.x, cellSize.y) },
      uMouse: { value: new THREE.Vector2(-10000, -10000) }, // offscreen = no lens
      uMouseVel: { value: 0 },
      uBurst: { value: 0 },
      uMotionOK: { value: 1 },
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  material.userData.circadian = circadian;
  material.userData.burst = 0;
  material.userData.lastChapter = -1;

  return material;
}

/**
 * Feed cursor position (client px, top-down) + normalized velocity (0..1)
 * into the ASCII field. Drives the mouse lens + scramble ring.
 * Safe to call every pointermove; velocity decays per-frame in update.
 */
export function setProceduralAsciiMouse(
  material: THREE.ShaderMaterial,
  clientX: number,
  clientY: number,
  velocity: number,
  viewportHeight: number,
) {
  const u = material.uniforms;
  (u.uMouse.value as THREE.Vector2).set(clientX, viewportHeight - clientY);
  const vel = u.uMouseVel.value as number;
  u.uMouseVel.value = Math.min(1, Math.max(velocity, vel));
}

export function updateProceduralAscii(
  material: THREE.ShaderMaterial,
  time: number,
  scroll: number,
  width: number,
  height: number,
  reducedMotion = false,
) {
  const u = material.uniforms;
  u.uTime.value = time;
  u.uScroll.value = scroll;
  u.uResolution.value.set(width, height);
  u.uMotionOK.value = reducedMotion ? 0 : 1;
  // Mouse velocity decays each frame so the scramble ring calms when still.
  u.uMouseVel.value = (u.uMouseVel.value as number) * 0.9;
  // Chapter-transition scramble burst: fires once per chapter change, decays.
  const chapter = Math.floor(scroll * 7.0);
  if (
    material.userData.lastChapter !== -1 &&
    material.userData.lastChapter !== chapter
  ) {
    material.userData.burst = 1.0;
  }
  material.userData.lastChapter = chapter;
  const burst = ((material.userData.burst as number) ?? 0) * 0.93;
  material.userData.burst = burst;
  u.uBurst.value = reducedMotion ? 0 : burst;
  // Circadian drift: ease phosphors toward the current time-of-day palette.
  if (material.userData.circadian) {
    const target = getCircadianPalette();
    (u.uColorA.value as THREE.Color).lerp(target.colorA, 0.02);
    (u.uColorB.value as THREE.Color).lerp(target.colorB, 0.02);
  }
}
