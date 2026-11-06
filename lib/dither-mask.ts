// Ordered-dither reveal masks, built from the site's own blue-noise
// threshold tile (lib/blue-noise.ts — run-7 seam's tile).
//
// Rank order IS the threshold: for step s of DITHER_STEPS, the tile shows
// exactly the pixels whose threshold value is below (s + 1) * (256 /
// DITHER_STEPS), so sweeping s from 0 to DITHER_STEPS - 1 dissolves a row
// in blue-noise order — isotropic grain, no cross-hatch gridding — and
// step DITHER_STEPS (mask cleared) is the fully revealed state.
//
// Tiles are generated lazily in the browser (canvas + toDataURL) and cached;
// nothing is generated during SSR, so server HTML never carries a mask and
// rows render fully visible without JS.
import { BLUE_NOISE_128 } from "./blue-noise";

/** Dissolve granularity: 32 steps over the reveal (finer than the tile
    doc's 16-level note, so the site ease-out's fast start still reads as a
    progressive grain rather than a pop). */
export const DITHER_STEPS = 32;

const TILE = 128;
const cache = new Map<number, string>();

/**
 * Data-URL PNG of the thresholded tile for `step` (0..DITHER_STEPS-1):
 * white where the row shows through, transparent where it is still hidden.
 * Returns null for step >= DITHER_STEPS (fully revealed — caller clears the
 * mask) and when there is no document (SSR).
 */
export function ditherMaskUrl(step: number): string | null {
  if (step >= DITHER_STEPS) return null;
  if (typeof document === "undefined") return null;
  const hit = cache.get(step);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(TILE, TILE);
  const cut = (step + 1) * (256 / DITHER_STEPS);
  for (let i = 0; i < TILE * TILE; i++) {
    const on = BLUE_NOISE_128[i] < cut;
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = on ? 255 : 0;
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL("image/png");
  cache.set(step, url);
  return url;
}
