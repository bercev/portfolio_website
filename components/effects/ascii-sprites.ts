import * as THREE from "three";

/**
 * ASCII glyph texture atlas for replacing 3D geometric decorations
 * with ASCII-art sprites. Glyphs are drawn white on transparent;
 * tint via vertex colors or material color.
 *
 * Atlas layout (2x2):
 *   0: ◆ diamond (replaces octahedron crystals)
 *   1: ▲ triangle (replaces tetrahedron outriders)
 *   2: ○ ring (replaces torus gates / drift rings)
 *   3: ✦ spark (replaces small debris / cones)
 */

const GLYPHS = ["◆", "▲", "○", "✦"] as const;
export type AsciiGlyphIndex = 0 | 1 | 2 | 3;

let atlasTexture: THREE.CanvasTexture | null = null;

export function getAsciiGlyphAtlas(): THREE.CanvasTexture {
  if (atlasTexture) return atlasTexture;
  const cell = 128;
  const canvas = document.createElement("canvas");
  canvas.width = cell * 2;
  canvas.height = cell * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context for ascii glyph atlas");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Use a font size that fills the cell without clipping.
  ctx.font = `${Math.floor(cell * 0.72)}px "JetBrains Mono", ui-monospace, monospace`;
  GLYPHS.forEach((g, i) => {
    const cx = (i % 2) * cell + cell / 2;
    const cy = Math.floor(i / 2) * cell + cell / 2;
    ctx.fillText(g, cx, cy);
  });
  atlasTexture = new THREE.CanvasTexture(canvas);
  atlasTexture.needsUpdate = true;
  return atlasTexture;
}

export type AsciiPointSpec = {
  readonly position: THREE.Vector3;
  readonly color: THREE.Color;
  readonly size: number;
  readonly glyph: AsciiGlyphIndex;
  readonly opacity?: number;
};

/**
 * Build a THREE.Points cloud where each point renders an ASCII glyph
 * from the atlas. One draw call, camera-facing, per-point size/color/glyph.
 */
export function buildAsciiPoints(
  specs: readonly AsciiPointSpec[],
  blending: THREE.Blending,
): THREE.Points {
  const count = specs.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const glyphs = new Float32Array(count);
  const opacities = new Float32Array(count);

  specs.forEach((s, i) => {
    positions[i * 3] = s.position.x;
    positions[i * 3 + 1] = s.position.y;
    positions[i * 3 + 2] = s.position.z;
    colors[i * 3] = s.color.r;
    colors[i * 3 + 1] = s.color.g;
    colors[i * 3 + 2] = s.color.b;
    sizes[i] = s.size;
    glyphs[i] = s.glyph;
    opacities[i] = s.opacity ?? 1;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aGlyph", new THREE.BufferAttribute(glyphs, 1));
  geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: getAsciiGlyphAtlas() },
    },
    transparent: true,
    depthWrite: false,
    blending,
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aGlyph;
      attribute float aOpacity;
      varying vec3 vColor;
      varying float vGlyph;
      varying float vOpacity;
      void main() {
        vColor = aColor;
        vGlyph = aGlyph;
        vOpacity = aOpacity;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (280.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      varying vec3 vColor;
      varying float vGlyph;
      varying float vOpacity;
      void main() {
        // Map glyph index to atlas cell UV (gl_PointCoord only exists in fragment shaders).
        float gx = mod(vGlyph, 2.0);
        float gy = floor(vGlyph / 2.0);
        // gl_PointCoord origin is top-left; atlas cells laid out the same.
        vec2 cellUv = vec2((gx + gl_PointCoord.x) / 2.0, (gy + gl_PointCoord.y) / 2.0);
        vec4 tex = texture2D(uAtlas, cellUv);
        if (tex.a < 0.05) discard;
        gl_FragColor = vec4(vColor, tex.a * vOpacity);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.userData.noAura = true;
  points.frustumCulled = false;
  return points;
}

/**
 * A large ASCII-art ring (for chapter gates). Drawn with ○ characters
 * arranged in a circle on a canvas, used as a billboarded sprite.
 */
export function makeAsciiRingTexture(
  color: string,
  segments = 28,
  size = 256,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context for ascii ring");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontPx = Math.floor(size / 9);
  ctx.font = `${fontPx}px "JetBrains Mono", ui-monospace, monospace`;
  const radius = size * 0.38;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = size / 2 + Math.cos(a) * radius;
    const y = size / 2 + Math.sin(a) * radius;
    // Alternate ○ and · for a hand-drawn terminal feel.
    ctx.fillText(i % 2 === 0 ? "○" : "·", x, y);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * A single ASCII glyph as a sprite-ready texture (for hero spark, etc.).
 */
export function makeAsciiGlyphSprite(
  glyph: string,
  color: string,
  size = 128,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context for ascii glyph sprite");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.floor(size * 0.72)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText(glyph, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
