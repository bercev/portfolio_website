import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/**
 * INSANE ASCII postprocessing — the entire 3D journey rendered as living
 * terminal art. Braille cells for 4x resolution, per-chapter themed
 * character sets, depth-based density, phosphor colors, animated shimmer.
 *
 * Design principles from the ascii-art skill (synthalorian/cachyos-synthwave84):
 * - Gradient Volume: ▓ ▒ ░ dense→sparse for form shading
 * - Light-Source Shading: ▀ ▄ half-blocks
 * - Organic Texture: Braille dots for ethereal patterns
 * - Block Elements for solid fills
 */

// Per-chapter themed character sets — each chapter has its own ASCII mood.
export const ASCII_THEMES = {
  hero: "█▓▒░<>/\\{}[]()*+=",           // Energy, code, raw
  about: "≈≋~-.·:;+*≈≋",                 // Data waves, flow
  publications: "Σπ→∇λ∞∴∵√∫",           // Math symbols
  experience: "═║╔╗╚╝╠╣╦╩╬│─",           // Box drawing, structure
  projects: "{}/<>[]()=;:",              // Code brackets
  skills: "◆◈●○■□▲△▼▽★☆",               // Geometric
  contact: "✦✧★☆·:;+*✦✧",               // Sparkles
  default: " .·:;+*?%#@",
} as const;

export type AsciiTheme = keyof typeof ASCII_THEMES;

// Braille patterns for ultra-high resolution (2×4 dots per cell).
// Each Braille char represents 8 sub-pixels — 4x the detail of block chars.
const BRAILLE_BASE = 0x2800;
function brailleChar(dots: number): string {
  return String.fromCharCode(BRAILLE_BASE + dots);
}

function buildBrailleAtlas(glyphPx = 48): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  // 256 possible Braille patterns (8 dots = 2^8)
  c.width = glyphPx * 16;
  c.height = glyphPx * 16;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for Braille atlas");

  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#ffffff";
  // Draw Braille dots manually for crisp rendering
  const dotR = glyphPx * 0.12;
  const cellW = glyphPx / 2;
  const cellH = glyphPx / 4;
  for (let pattern = 0; pattern < 256; pattern++) {
    const cx = (pattern % 16) * glyphPx;
    const cy = Math.floor(pattern / 16) * glyphPx;
    for (let dot = 0; dot < 8; dot++) {
      if (pattern & (1 << dot)) {
        const dx = (dot % 2) * cellW + cellW / 2;
        const dy = Math.floor(dot / 2) * cellH + cellH / 2;
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(c);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function buildThemedAtlas(
  charset: string,
  glyphPx = 96,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = glyphPx * charset.length;
  c.height = glyphPx;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for ASCII atlas");

  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.floor(glyphPx * 0.72)}px ui-monospace, Courier, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < charset.length; i++) {
    ctx.fillText(charset[i], i * glyphPx + glyphPx / 2, glyphPx / 2);
  }

  const texture = new THREE.CanvasTexture(c);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

const asciiVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const asciiFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D uBrailleAtlas;
  uniform sampler2D uThemeAtlas;
  uniform vec2 uResolution;
  uniform vec2 uCellSize;      // Braille cell size in pixels (e.g., 8x16)
  uniform float uTime;
  uniform float uThemeGlyphCount;
  uniform float uMode;         // 0 = Braille, 1 = Themed, 2 = Blend
  uniform vec3 uPhosphorColor; // Terminal phosphor tint
  uniform float uShimmer;      // Animated shimmer intensity

  varying vec2 vUv;

  // Sample luminance at a sub-pixel offset within the Braille cell
  float sampleLum(vec2 uv, vec2 offset) {
    vec2 suv = clamp(uv + offset / uResolution, 0.0, 1.0);
    vec3 col = texture2D(tDiffuse, suv).rgb;
    return dot(col, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    // Braille cell grid
    vec2 cellIdx = floor(vUv * uResolution / uCellSize);
    vec2 cellUv = fract(vUv * uResolution / uCellSize);

    // Sample 8 sub-pixels for Braille dots (2x4 grid)
    float threshold = 0.35;
    int pattern = 0;
    // Dot positions: (0,0)=bit0, (1,0)=bit3, (0,1)=bit1, (1,1)=bit4, etc.
    // Braille dot numbering: 1-2-3-4 down left, 5-6-7-8 down right
    vec2 dotOffsets[8];
    dotOffsets[0] = vec2(0.25, 0.125); dotOffsets[1] = vec2(0.25, 0.375);
    dotOffsets[2] = vec2(0.25, 0.625); dotOffsets[3] = vec2(0.25, 0.875);
    dotOffsets[4] = vec2(0.75, 0.125); dotOffsets[5] = vec2(0.75, 0.375);
    dotOffsets[6] = vec2(0.75, 0.625); dotOffsets[7] = vec2(0.75, 0.875);

    for (int i = 0; i < 8; i++) {
      vec2 suv = (cellIdx * uCellSize + dotOffsets[i] * uCellSize) / uResolution;
      float lum = dot(texture2D(tDiffuse, suv).rgb, vec3(0.299, 0.587, 0.114));
      // Animated shimmer: threshold oscillates subtly
      float shimmerThresh = threshold + sin(uTime * 3.0 + float(i) * 1.7 + cellIdx.x * 0.1) * uShimmer * 0.08;
      if (lum > shimmerThresh) {
        pattern |= (1 << i);
      }
    }

    // Look up Braille glyph from atlas (16x16 grid)
    vec2 brailleUv = (vec2(float(pattern % 16), float(pattern / 16)) + cellUv) / 16.0;
    float brailleAlpha = texture2D(uBrailleAtlas, brailleUv).a;

    // Themed character mode: sample center luminance, map to theme charset
    vec2 centerUv = (cellIdx * uCellSize + uCellSize * 0.5) / uResolution;
    float centerLum = dot(texture2D(tDiffuse, centerUv).rgb, vec3(0.299, 0.587, 0.114));
    float themeIdx = floor(centerLum * (uThemeGlyphCount - 1.0));
    vec2 themeUv = (vec2(themeIdx + cellUv.x, cellUv.y));
    themeUv.x /= uThemeGlyphCount;
    float themeAlpha = texture2D(uThemeAtlas, themeUv).a;

    // Blend modes
    float alpha;
    if (uMode < 0.5) {
      alpha = brailleAlpha;
    } else if (uMode < 1.5) {
      alpha = themeAlpha;
    } else {
      alpha = max(brailleAlpha, themeAlpha * 0.7);
    }

    // Phosphor color with luminance-based intensity
    vec3 col = texture2D(tDiffuse, centerUv).rgb;
    vec3 phosphor = mix(uPhosphorColor, col, 0.4); // Blend phosphor with source color
    float intensity = 0.3 + 0.7 * centerLum;

    // Dark terminal background
    vec3 bg = vec3(0.02, 0.03, 0.05); // Deep terminal black-blue
    vec3 final = mix(bg, phosphor * intensity * 1.8, alpha);

    gl_FragColor = vec4(final, 1.0);
  }
`;

export interface AsciiPassOptions {
  cellSize?: { x: number; y: number };
  mode?: number; // 0=Braille, 1=Themed, 2=Blend
  theme?: AsciiTheme;
  phosphorColor?: THREE.Color;
  shimmer?: number;
}

export function createAsciiPass(options: AsciiPassOptions = {}): ShaderPass {
  const {
    cellSize = { x: 10, y: 20 },
    mode = 2, // Blend by default — insane detail
    theme = "default",
    phosphorColor = new THREE.Color(0.2, 0.9, 0.9), // Cyan phosphor
    shimmer = 1.0,
  } = options;

  const brailleAtlas = buildBrailleAtlas();
  const themeAtlas = buildThemedAtlas(ASCII_THEMES[theme]);

  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uBrailleAtlas: { value: brailleAtlas },
      uThemeAtlas: { value: themeAtlas },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCellSize: { value: new THREE.Vector2(cellSize.x, cellSize.y) },
      uTime: { value: 0 },
      uThemeGlyphCount: { value: ASCII_THEMES[theme].length },
      uMode: { value: mode },
      uPhosphorColor: { value: phosphorColor.clone() },
      uShimmer: { value: shimmer },
    },
    vertexShader: asciiVertexShader,
    fragmentShader: asciiFragmentShader,
  });

  // Store metadata for theme switching
  (pass as any).asciiTheme = theme;
  (pass as any).setTheme = (newTheme: AsciiTheme) => {
    const atlas = buildThemedAtlas(ASCII_THEMES[newTheme]);
    (pass.uniforms as any).uThemeAtlas.value = atlas;
    (pass.uniforms as any).uThemeGlyphCount.value = ASCII_THEMES[newTheme].length;
    (pass as any).asciiTheme = newTheme;
  };

  return pass;
}

export function updateAsciiPass(
  pass: ShaderPass,
  time: number,
  width: number,
  height: number,
) {
  const u = pass.uniforms as any;
  if (u.uTime) u.uTime.value = time;
  if (u.uResolution) u.uResolution.value.set(width, height);
}
