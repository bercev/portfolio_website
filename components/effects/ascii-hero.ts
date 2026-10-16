import * as THREE from "three";

import type { JourneyPalette } from "./journey-scene";

/**
 * BERAT as volumetric ASCII art — hand-designed block letterforms rendered as
 * glyph-sprite particles in 3D space. Zones per particle:
 *   halo (dilated outline) → ░ dim
 *   top edge → ▀, bottom edge → ▄ (light from above), side edge → ▒
 *   fill → vertical gradient █ core / ▓, with Braille ⠿ texture sprinkles
 *   ~3% amber "signal" particles pulse — the cyan→amber story arc in the name.
 *
 * Design principles: gradient volume (▓▒░), light-source shading (▀▄),
 * thick outlines with hollow-feel halo, Braille organic texture.
 */

// 7-wide x 9-tall hand-tuned block letterforms.
const LETTERS: Record<string, string[]> = {
  B: [
    "1111100",
    "1000100",
    "1000100",
    "1000100",
    "1111100",
    "1000100",
    "1000100",
    "1000100",
    "1111100",
  ],
  E: [
    "1111110",
    "1000000",
    "1000000",
    "1000000",
    "1111100",
    "1000000",
    "1000000",
    "1000000",
    "1111110",
  ],
  R: [
    "1111100",
    "1000100",
    "1000100",
    "1000100",
    "1111100",
    "1010000",
    "1001000",
    "1000100",
    "1000010",
  ],
  A: [
    "0111100",
    "1000100",
    "1000100",
    "1000100",
    "1111110",
    "1000100",
    "1000100",
    "1000100",
    "1000100",
  ],
  T: [
    "1111110",
    "0010000",
    "0010000",
    "0010000",
    "0010000",
    "0010000",
    "0010000",
    "0010000",
    "0010000",
  ],
};

// Glyph atlas order — must match indices used below.
const GLYPHS = ["░", "▒", "▓", "█", "▀", "▄", "⠿", "⠛", "◆", "·"];
const G_HALO = 0;
const G_EDGE_SIDE = 1;
const G_FILL_DIM = 2;
const G_FILL_CORE = 3;
const G_EDGE_TOP = 4;
const G_EDGE_BOTTOM = 5;
const G_TEXTURE = 6;

function buildGlyphAtlas(): THREE.CanvasTexture {
  const px = 64;
  const c = document.createElement("canvas");
  c.width = px * GLYPHS.length;
  c.height = px;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for hero glyph atlas");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.floor(px * 0.8)}px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  GLYPHS.forEach((g, i) => {
    ctx.fillText(g, i * px + px / 2, px / 2 + px * 0.04);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

interface Cell {
  x: number; // grid coords (in cell units)
  y: number;
  glyph: number; // base glyph index
  shade: number; // 0..1 brightness multiplier
  signal: number; // 0/1 amber pulse particle
  halo: boolean;
}

/** Compose the word grid, detect zones, return sampled cells. */
function designWord(text: string): { cells: Cell[]; cols: number; rows: number } {
  const gap = 2;
  const lw = 7;
  const lh = 9;
  const chars = text.toUpperCase().split("");
  const cols = chars.length * (lw + gap) - gap;
  const rows = lh;

  // filled[r][c]
  const filled: boolean[][] = Array.from({ length: rows }, () =>
    new Array<boolean>(cols).fill(false),
  );
  chars.forEach((ch, li) => {
    const glyph = LETTERS[ch];
    if (!glyph) return;
    const ox = li * (lw + gap);
    for (let r = 0; r < lh; r++) {
      for (let cI = 0; cI < lw; cI++) {
        if (glyph[r][cI] === "1") filled[r][ox + cI] = true;
      }
    }
  });

  const isFilled = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && filled[r][c];

  const cells: Cell[] = [];
  // Include 1-cell halo ring around the word.
  for (let r = -1; r <= rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const f = isFilled(r, c);
      // Halo: not filled, but adjacent (8-neighborhood) to filled.
      let near = false;
      if (!f) {
        for (let dr = -1; dr <= 1 && !near; dr++) {
          for (let dc = -1; dc <= 1 && !near; dc++) {
            if (isFilled(r + dr, c + dc)) near = true;
          }
        }
        if (!near) continue;
      }
      const vGrad = 1 - (r + 1) / (rows + 2); // 1 top → 0 bottom
      if (!f) {
        cells.push({ x: c, y: r, glyph: G_HALO, shade: 0.32, signal: 0, halo: true });
        continue;
      }
      const topEdge = !isFilled(r - 1, c);
      const botEdge = !isFilled(r + 1, c);
      const sideEdge = !isFilled(r, c - 1) || !isFilled(r, c + 1);
      // Deterministic pseudo-random from coords for texture sprinkles.
      const h = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
      let glyph: number;
      if (topEdge && !botEdge) glyph = G_EDGE_TOP;
      else if (botEdge && !topEdge) glyph = G_EDGE_BOTTOM;
      else if (sideEdge) glyph = G_EDGE_SIDE;
      else if (h < 0.12) glyph = G_TEXTURE;
      else glyph = vGrad > 0.45 ? G_FILL_CORE : G_FILL_DIM;
      const signal = !topEdge && !botEdge && !sideEdge && h > 0.965 ? 1 : 0;
      cells.push({
        x: c,
        y: r,
        glyph,
        shade: 0.55 + 0.45 * vGrad,
        signal,
        halo: false,
      });
    }
  }
  return { cells, cols: cols + 2, rows: rows + 2 };
}

export function buildAsciiHeroPoints(
  text: string,
  count: number,
  palette: JourneyPalette,
  worldH = 7,
  blending: THREE.Blending = THREE.AdditiveBlending,
  ink = false,
): THREE.Points {
  const { cells, cols, rows } = designWord(text || "BERAT");
  const atlas = buildGlyphAtlas();

  const worldW = worldH * (cols / rows);
  const cellW = worldW / cols;
  const cellH = worldH / rows;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const glyphs = new Float32Array(count);
  const shades = new Float32Array(count);
  const signals = new Float32Array(count);

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
  const amber = new THREE.Color(palette.amber);

  // Weight halo cells lower so the outline stays airy.
  const bag: Cell[] = [];
  for (const cell of cells) {
    bag.push(cell);
    if (!cell.halo) {
      bag.push(cell);
      bag.push(cell);
    }
  }

  for (let i = 0; i < count; i++) {
    const cell = bag[(Math.random() * bag.length) | 0] ?? cells[0];
    // Cell coords are offset by -1 (halo ring); recenter.
    const gx = cell.x + 1;
    const gy = cell.y + 1;
    positions[i * 3] =
      (gx / cols - 0.5) * worldW + (Math.random() - 0.5) * cellW * 0.5;
    positions[i * 3 + 1] =
      -(gy / rows - 0.5) * worldH + (Math.random() - 0.5) * cellH * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.42;

    const col =
      cell.signal === 1
        ? amber
        : colorStops[(Math.random() * colorStops.length) | 0];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    seeds[i] = Math.random() * Math.PI * 2;
    glyphs[i] = cell.glyph;
    shades[i] = cell.shade;
    signals[i] = cell.signal;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aGlyph", new THREE.BufferAttribute(glyphs, 1));
  geo.setAttribute("aShade", new THREE.BufferAttribute(shades, 1));
  geo.setAttribute("aSignal", new THREE.BufferAttribute(signals, 1));

  const glyphCount = GLYPHS.length;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
    blending,
    uniforms: {
      uTime: { value: 0 },
      uScatter: { value: 0 },
      uAtlas: { value: atlas },
    },
    vertexShader: `
      attribute float seed;
      attribute vec3 color;
      attribute float aGlyph;
      attribute float aShade;
      attribute float aSignal;
      varying vec3 vColor;
      varying float vFade;
      varying float vGlyph;
      varying float vSeed;
      varying float vSignal;
      uniform float uTime;
      uniform float uScatter;
      void main() {
        vColor = color${ink ? "" : " * 1.06"} * (0.45 + 0.75 * aShade);
        vGlyph = aGlyph;
        vSeed = seed;
        vSignal = aSignal;
        vec3 p = position;
        vec3 dir = normalize(vec3(sin(seed * 3.1), cos(seed * 2.3), sin(seed * 5.7)));
        p += dir * uScatter * (9.0 + seed * 2.0);
        p.y += sin(uTime * 0.8 + seed) * 0.05;
        p.x += cos(uTime * 0.6 + seed * 1.7) * 0.04;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = max(-mv.z, 0.35);
        float sizeBoost = 1.0 + aSignal * 0.55;
        gl_PointSize = min((1.35 + 1.15 * fract(seed)) * (${ink ? "64.0" : "88.0"} / dist) * sizeBoost, ${ink ? "10.0" : "14.0"});
        vFade = smoothstep(80.0, 16.0, dist) * smoothstep(0.45, 2.8, dist);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uAtlas;
      uniform float uTime;
      varying vec3 vColor;
      varying float vFade;
      varying float vGlyph;
      varying float vSeed;
      varying float vSignal;
      void main() {
        // Subtle living flicker: glyph occasionally shifts one step.
        float wob = sin(uTime * 2.1 + vSeed * 40.0);
        float g = clamp(vGlyph + round(wob * 0.7), 0.0, ${glyphCount - 1}.0);
        vec2 tuv = vec2((g + gl_PointCoord.x) / ${glyphCount}.0, 1.0 - gl_PointCoord.y);
        vec4 tex = texture2D(uAtlas, tuv);
        // Amber signal particles pulse.
        float pulse = 1.0 + vSignal * (0.45 * sin(uTime * 3.2 + vSeed * 50.0));
        float alpha = tex.a * vFade${ink ? "" : " * 1.08"} * pulse;
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(vColor * pulse, alpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}
