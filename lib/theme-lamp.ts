import type { CSSProperties } from "react";

import type { ThemePalette, ThemeSwatchRow } from "./theme-palette";

/**
 * RUN9-THEME-LAMP: press-and-hold a Swatch Library row and a drafting
 * lamp projects onto the page, previewing that theme's paper before
 * committing; release commits. Pure helpers + constants (no DOM reads
 * except the caller's getBoundingClientRect, passed in as data).
 */

/** How long a row must be held before the lamp switches on. */
export const THEME_LAMP_HOLD_MS = 300;
/** The beam's sweep out from the row (~250ms ease-out per the item). */
export const THEME_LAMP_BEAM_MS = 250;
/** The beam's dissolve once the lamp is released. */
export const THEME_LAMP_FADE_MS = 250;
/** The beam's height — a drafting-lamp flood, not a laser. */
export const THEME_LAMP_BEAM_HEIGHT = 300;

export type LampBeamRect = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly height: number;
};

export type LampBeamGeometry = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/**
 * The dataset value the lamp previews for a row — the row's own key, or
 * null for Base (no override). The preview writes this straight to
 * `documentElement.dataset.palette` without touching provider state or
 * localStorage, so a cancelled hold leaves nothing behind.
 */
export function themeLampPreviewKey(
  row: ThemeSwatchRow,
): ThemePalette | null {
  return row.key;
}

/**
 * The beam's viewport box: it spans from the viewport's left edge to the
 * row's right edge (the plate is right-anchored, so the lamp always
 * projects leftward across the sheet), 300px tall, centred on the row and
 * clamped inside the viewport.
 */
export function lampBeamGeometry(
  row: LampBeamRect,
  viewportWidth: number,
  viewportHeight: number,
): LampBeamGeometry {
  const height = Math.min(THEME_LAMP_BEAM_HEIGHT, viewportHeight);
  const centerY = row.top + row.height / 2;
  const top = Math.max(
    0,
    Math.min(centerY - height / 2, viewportHeight - height),
  );
  return {
    left: 0,
    top: Math.round(top),
    width: Math.max(0, Math.round(row.right)),
    height,
  };
}

/** The cone: wide at the viewport's left edge, narrow at the row. */
export function lampBeamClipPath(): string {
  return "polygon(0 0, 0 100%, 100% 58%, 100% 42%)";
}

/**
 * The beam's inline style: strongest in the row's accent at the source
 * (right), dissolving leftward; transform-origin at the row so the
 * scaleX sweep grows out of the lamp.
 */
export function lampBeamStyle(
  accent: string,
  geometry: LampBeamGeometry,
): CSSProperties {
  return {
    left: geometry.left,
    top: geometry.top,
    width: geometry.width,
    height: geometry.height,
    background: `linear-gradient(to left, ${accent}59, ${accent}26 45%, transparent 92%)`,
    clipPath: lampBeamClipPath(),
    transformOrigin: "right center",
  };
}
