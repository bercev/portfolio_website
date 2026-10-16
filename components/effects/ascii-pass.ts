import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/**
 * Full-scene ASCII postprocessing: converts the rendered 3D scene into live
 * ASCII art via a fullscreen shader pass. Placed after bloom in the composer.
 */

const CHARSET = " .·:;+*?%#@";
const EDGE_CHARS = "-|/\\";

function buildGlyphAtlas(
  charset: string,
  glyphPx = 96,
): { texture: THREE.CanvasTexture; count: number } {
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
  return { texture, count: charset.length };
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
  uniform sampler2D uAtlas;
  uniform sampler2D uEdgeAtlas;
  uniform float uGlyphCount;
  uniform vec2 uResolution;
  uniform vec2 uCellSize;
  uniform vec3 uInk;
  uniform vec3 uBackground;
  uniform int uColorMode;
  uniform float uBrightness;
  uniform float uContrast;
  uniform float uGamma;
  uniform float uInvert;
  uniform bool uUseEdges;
  uniform float uEdgeThreshold;
  uniform float uGlyphScale;
  varying vec2 vUv;

  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    vec2 cellCount = uResolution / uCellSize;
    vec2 cellId = floor(vUv * cellCount);
    vec2 cellUV = fract(vUv * cellCount);
    vec2 centerUV = (cellId + 0.5) / cellCount;
    vec3 centerCol = texture2D(tDiffuse, centerUV).rgb;

    float edge = 0.0;
    float angle = 0.0;
    if (uUseEdges) {
      vec2 e = 1.0 / uResolution;
      float tl = luma(texture2D(tDiffuse, centerUV + e * vec2(-1., 1.)).rgb);
      float tt = luma(texture2D(tDiffuse, centerUV + e * vec2( 0., 1.)).rgb);
      float tr = luma(texture2D(tDiffuse, centerUV + e * vec2( 1., 1.)).rgb);
      float ll = luma(texture2D(tDiffuse, centerUV + e * vec2(-1., 0.)).rgb);
      float rr = luma(texture2D(tDiffuse, centerUV + e * vec2( 1., 0.)).rgb);
      float bl = luma(texture2D(tDiffuse, centerUV + e * vec2(-1.,-1.)).rgb);
      float bb = luma(texture2D(tDiffuse, centerUV + e * vec2( 0.,-1.)).rgb);
      float br = luma(texture2D(tDiffuse, centerUV + e * vec2( 1.,-1.)).rgb);
      float gx = -tl - 2.0 * ll - bl + tr + 2.0 * rr + br;
      float gy = -tl - 2.0 * tt - tr + bl + 2.0 * bb + br;
      edge = length(vec2(gx, gy));
      angle = atan(gy, gx);
    }

    float l = pow(clamp(luma(centerCol), 0.0, 1.0), 1.0 / max(uGamma, 0.001));
    l = clamp((l - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
    l = mix(l, 1.0 - l, uInvert);

    vec2 g = (cellUV - 0.5) / uGlyphScale + 0.5;
    float mask;
    vec2 atlasUV;
    if (uUseEdges && edge > uEdgeThreshold) {
      float a = abs(mod(angle, 3.14159265));
      float ei = (a < 0.3927 || a > 2.7489) ? 0.0
               : (a < 1.1781) ? 2.0
               : (a < 1.9635) ? 1.0 : 3.0;
      atlasUV = vec2((ei + clamp(g.x, 0., 1.)) / 4.0, clamp(g.y, 0., 1.));
      mask = texture2D(uEdgeAtlas, atlasUV).a;
    } else {
      float gi = floor(l * (uGlyphCount - 1.0) + 0.5);
      atlasUV = vec2((gi + clamp(g.x, 0., 1.)) / uGlyphCount, clamp(g.y, 0., 1.));
      mask = texture2D(uAtlas, atlasUV).a;
    }

    vec3 inkCol = (uColorMode == 1) ? centerCol : uInk;
    vec3 bgCol = (uColorMode == 2) ? texture2D(tDiffuse, vUv).rgb : uBackground;
    gl_FragColor = vec4(mix(bgCol, inkCol, mask), 1.0);
  }
`;

export type AsciiPassOptions = {
  readonly cellWidth?: number;
  readonly cellHeight?: number;
  readonly ink?: THREE.Color;
  readonly background?: THREE.Color;
  readonly colorMode?: number;
  readonly invert?: number;
};

export function createAsciiPass(options: AsciiPassOptions = {}): ShaderPass {
  const { texture: atlas, count } = buildGlyphAtlas(CHARSET);
  const { texture: edgeAtlas } = buildGlyphAtlas(EDGE_CHARS);

  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uAtlas: { value: atlas },
      uEdgeAtlas: { value: edgeAtlas },
      uGlyphCount: { value: count },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCellSize: {
        value: new THREE.Vector2(options.cellWidth ?? 10, options.cellHeight ?? 18),
      },
      uInk: { value: options.ink ?? new THREE.Color("#00d8ff") },
      uBackground: { value: options.background ?? new THREE.Color("#05070c") },
      uColorMode: { value: options.colorMode ?? 1 },
      uBrightness: { value: 0 },
      uContrast: { value: 1.1 },
      uGamma: { value: 1.0 },
      uInvert: { value: options.invert ?? 0 },
      uUseEdges: { value: true },
      uEdgeThreshold: { value: 0.22 },
      uGlyphScale: { value: 0.85 },
    },
    vertexShader: asciiVertexShader,
    fragmentShader: asciiFragmentShader,
  });

  return pass;
}

export function updateAsciiResolution(
  pass: ShaderPass,
  width: number,
  height: number,
  pixelRatio: number,
) {
  const res = pass.uniforms.uResolution.value as THREE.Vector2;
  res.set(width * pixelRatio, height * pixelRatio);
}
