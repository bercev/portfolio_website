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

  void main() {
    vec2 uv = vUv;
    vec2 px = uv * uResolution;

    // Braille cell
    vec2 cellIdx = floor(px / uCellSize);
    vec2 cellUv = fract(px / uCellSize);

    // Scroll-reactive: different procedural worlds per chapter
    float chapter = uScroll * 7.0; // 0..7
    float t = uTime * 0.3;

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

    // Braille dots: 2x4 grid, threshold by field
    float threshold = 0.45;
    int pattern = 0;
    vec2 dotOffsets[8];
    dotOffsets[0] = vec2(0.25, 0.125); dotOffsets[1] = vec2(0.25, 0.375);
    dotOffsets[2] = vec2(0.25, 0.625); dotOffsets[3] = vec2(0.25, 0.875);
    dotOffsets[4] = vec2(0.75, 0.125); dotOffsets[5] = vec2(0.75, 0.375);
    dotOffsets[6] = vec2(0.75, 0.625); dotOffsets[7] = vec2(0.75, 0.875);

    for (int i = 0; i < 8; i++) {
      // Sample field at dot position with slight offset for variation
      vec2 dotCell = cellIdx + (dotOffsets[i] - 0.5) * 0.5;
      vec2 dp = dotCell * 0.08;
      dp.x += t * 0.5;
      float dotField = fbm(dp + chapter * 10.0) * 0.7 +
                       sin(dotCell.x * 0.05 + t * 2.0) * sin(dotCell.y * 0.04 - t * 1.5) * 0.3;
      if (dotField > threshold) {
        pattern |= (1 << i);
      }
    }

    // Braille atlas lookup (16x16 grid, built in JS)
    // For now, render dots directly as circles (simpler, no atlas needed)
    vec2 brailleUv = cellUv;
    float alpha = 0.0;
    for (int i = 0; i < 8; i++) {
      if ((pattern & (1 << i)) != 0) {
        vec2 dotPos = dotOffsets[i];
        float d = length((brailleUv - dotPos) * vec2(1.0, 2.0)); // Elliptical for cell aspect
        alpha = max(alpha, smoothstep(0.18, 0.12, d));
      }
    }

    // Color: lerp between phosphors by field + chapter
    vec3 col = mix(uColorA, uColorB, smoothstep(0.3, 0.7, field));
    col *= 0.4 + 0.6 * smoothstep(0.3, 0.8, field);

    // Dark background
    vec3 bg = vec3(0.008, 0.012, 0.02);
    vec3 final = mix(bg, col, alpha * 0.9);

    gl_FragColor = vec4(final, 1.0);
  }
`;

export interface ProceduralAsciiOptions {
  cellSize?: { x: number; y: number };
  colorA?: THREE.Color;
  colorB?: THREE.Color;
}

export function createProceduralAscii(
  options: ProceduralAsciiOptions = {},
): THREE.ShaderMaterial {
  const {
    cellSize = { x: 12, y: 24 },
    colorA = new THREE.Color(0.2, 0.9, 0.9), // Cyan
    colorB = new THREE.Color(1.0, 0.7, 0.2), // Amber
  } = options;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uColorA: { value: colorA.clone() },
      uColorB: { value: colorB.clone() },
      uCellSize: { value: new THREE.Vector2(cellSize.x, cellSize.y) },
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  return material;
}

export function updateProceduralAscii(
  material: THREE.ShaderMaterial,
  time: number,
  scroll: number,
  width: number,
  height: number,
) {
  const u = material.uniforms;
  u.uTime.value = time;
  u.uScroll.value = scroll;
  u.uResolution.value.set(width, height);
}
