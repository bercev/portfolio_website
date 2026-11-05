"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";

/**
 * LightRibbons — run 7: the user-approved Waylume-style animated light
 * background, ported from `~/workspace/deliverables/waylume-variant/`
 * (motion v2 — the version he approved after "make sure it's animated")
 * into the live site as its background layer, replacing the floating
 * glyph field's ambient role.
 *
 * Technique (variant parity): Canvas2D, 4 broad diagonal light sheets
 * in the accent family, rendered as thin vertical slices from soft
 * vertical-gradient sprites onto a half-resolution offscreen, composited
 * additively with a ~4px blur pass (sheets, not strands, no banding).
 * A 5th narrow "edge" band was tried in run-7 iter 5 to give the
 * desktop pair a trackable leading edge (parallel, then counter-
 * diagonal) and reverted after two fresh strict critics failed it —
 * see the DESKTOP_RIBBONS comment. The rail guard in energy() is the
 * shipped part of that iteration.
 * Motion v2 params: phase-travel periods 9–14s, wobble 34–52px /
 * 18–26px, lateral drift ±60–90px on 11.5–14s cycles, vertical glide
 * ±20–30px, brightness breathing ±16–20% on 7.3–8.6s cycles — fast
 * enough that two hero frames 3s apart show obvious ribbon travel.
 * Run-7 iter 7 adds ONE traveling flare (RUN7-MOTION-FLARE) riding
 * the central "bright" band's centerline — a compact bright head +
 * short fading tail, the trackable object the two reverted edge bands
 * (iter 5) failed to be: ~180px/s desktop so it moves ~540px in 3s
 * with zero overlap between old/new positions, one crossing every
 * ~12s with a 3s pause and fade in/out at the ends, never a permanent
 * neon line. Narrow screens run the head SLOWER (~90px/s, bigger head,
 * tighter tail — in-iteration tuning after the strict critic failed
 * the mobile pair: at 140px/s the head crossed the whole 390px
 * viewport between the pair's frames, so no 3s-apart pair could ever
 * show it twice; at 90px/s it stays on-screen across the pair and
 * still moves ~270px in 3s).
 * The head is drawn SHARP on the main canvas (unblurred, over the
 * blurred sheets — the Codrops sharp-core-over-blurred-glow lesson),
 * AFTER the column halo (the halo dimmed the first version's head to
 * +38 luma — invisible at a glance), in the live accent family, with
 * the same energy() suppression (column + rail guard) as the bands;
 * reduced motion = absent.
 * Narrow screens (W < 700) run the faster NARROW_RIBBONS profile
 * (run-7 iter 2, RUN7-MOTION-VIS) — see its comment below. Desktop
 * runs DESKTOP_RIBBONS (same iteration, in-iteration tuning after
 * the strict motion critic failed the desktop pair narrowly while
 * passing mobile: periods ×0.75, drift ×1.3, amplitudes ×1.2,
 * alpha ×1.15, in-column energy 0.34 → 0.50, halo 0.40 → 0.30).
 *
 * Live-site adaptations (the variant is a standalone FROST page):
 * - Colors come from the LIVE theme tokens, never hardcoded hexes:
 *   --accent-neon is the ribbon family (deep/bright/mid derived by
 *   shade mixes), --effect-glow is the pale ribbon, --background is the
 *   column halo. Sprites rebuild whenever theme or palette changes, so
 *   all 5 palettes keep working. NOTE the FROST remap
 *   (app/globals.css): while data-ascii is active, the page remaps
 *   every accent to ocean #7dd3fc and the background to dark — so in
 *   motion mode the ribbons always read ocean-on-dark, whatever palette
 *   or light/dark setting the visitor chose, because the probe reads the
 *   remapped tokens — including at mount: the probe re-runs after the
 *   canvas effect claims data-ascii (RUN7-LIGHT-PROBE, run-7 iter 4),
 *   since the mount-order probe runs before the claim and would
 *   otherwise read pre-remap tokens (light #f3f7fc background, dark
 *   slate glow, un-collapsed palette accent). Palettes genuinely apply only under reduced motion
 *   (where the remap is off and the controls unlock); the static frame
 *   repaints on palette change so it follows them there. Light mode
 *   draws the same ribbons with normal compositing at halved alpha
 *   (additive would wash out on a light background) — the composite is
 *   keyed off the PROBED background luminance, not the theme setting, so
 *   the remap's forced-dark page still gets additive ribbons.
 * - Content-zone calm: ribbon energy is suppressed inside the live
 *   content column (measured from [data-hero-editorial], the centered
 *   1200px measure every section shares) with a 150px feather, plus a
 *   soft background-colored halo over the column — margins and edges
 *   carry the light, text zones stay dark and crisp.
 * - Pauses when the tab hides; one static frame under reduced motion.
 * - Per-section light chapters (run-7 iter 8, RUN7-EXP-CHAPTER-LIGHT):
 *   each section declares its ribbon character via data-light-chapter;
 *   the loop lerps the ribbon profile (angle/thickness/intensity/speed
 *   + pale/deep role mix, all multipliers inside the live cyan family)
 *   toward the profile of the section owning the viewport center —
 *   a discrete toggle with a ~600ms crossfade, re-based on the current
 *   values when the chapter changes again mid-tween (stale-tween
 *   cancellation), exactly reversible on scroll-up since detection is
 *   positional. Reduced motion repaints one static frame of the active
 *   chapter on scroll (discrete switch, no animation).
 *
 * Contracts preserved from the glyph field it replaces:
 * - It claims the page background via documentElement[data-journey=
 *   "active"] — EffectStage uses that claim to keep the loud Neural Ink
 *   shader backdrop unmounted. (The attribute name is historical; it
 *   means "background claimed".)
 * - While animating it sets documentElement[data-ascii="active"], which
 *   is what the ASCII portrait bust keys its visibility on.
 * - Under prefers-reduced-motion it paints ONE static frame and does NOT
 *   set data-ascii (the bust is intentionally absent in the static
 *   profile — audited behavior, run-4 iter 26).
 *
 * Retired with the glyph field (its canvas owned them): the scroll 3D
 * objects, chapter pings, keystroke ripple, and contact-transmit burst.
 * The glyph component file stays in the tree unmounted for a later
 * experiment to reintroduce dither/glyph texture over the ribbons.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

type RibbonRole = "deep" | "bright" | "pale" | "accent";

interface RibbonDef {
  y0: number;
  slope: number;
  th: number;
  alpha: number;
  role: RibbonRole;
  a1: number;
  f1: number;
  p1: number;
  a2: number;
  f2: number;
  p2: number;
  drift: number;
  dp: number;
  ga: number;
  gp: number;
  gph: number;
  bd: number;
  bp: number;
  bph: number;
}

/**
 * Ribbon field glossary (shared by both profiles below). y0: centre
 * height at x=0 (fraction of H). slope: px drop per px across. p1/p2
 * are phase-travel periods; drift/dp a slow lateral pattern shift;
 * ga/gp glide the whole band up/down; bd/bp breathe brightness.
 * Base geometry is verbatim from the approved variant (motion v2);
 * both live profiles are scaled from it (see their comments).
 */

/**
 * Narrow-screen profile (W < 700, run-7 iter 2, RUN7-MOTION-VIS): the
 * iter-1 port passed the motion pair on desktop (narrowly) but failed
 * at 390px — critics: "pixel-diff-detectable, not obvious", margin
 * change only 6.4%, zero change below ~60% of the hero frame. The
 * failure is structural, not a parameter rounding error: on a 390px
 * viewport the content column spans the whole width, so the only
 * full-energy margins are ~20px slivers, the column sat at minS 0.6
 * under a 0.25 halo, and all four bands live in the top ~40% of the
 * frame. This profile is a SUBSTANTIAL narrow-screen change, not a
 * marginal tweak: phase-travel periods ×0.55 (faster), drift ×1.5,
 * wobble/glide amplitudes ×1.25–1.3, brightness swing up, alpha ×1.1,
 * plus a FIFTH low band (y0 0.62) so the lower hero moves too. Desktop
 * got its own milder boost in the same iteration (DESKTOP_RIBBONS
 * below) after the strict critic failed the desktop pair narrowly.
 * Column suppression stays (minS
 * 0.78, halo 0.15): the column is where the pixels are on a phone, so
 * the bands must be visible THERE, with the halo still keeping text
 * crisp. Same hue family, same soft look — no global brightness lift,
 * loudness discipline holds (2 soft + 1 loud).
 */
const NARROW_RIBBONS: ReadonlyArray<RibbonDef> = [  {
    y0: -0.04, slope: 0.14, th: 205, alpha: 0.48, role: "deep",
    a1: 50, f1: 0.0042, p1: 6050, a2: 25, f2: 0.0095, p2: 7425,
    drift: 105, dp: 7150, ga: 31, gp: 7350, gph: 0.0, bd: 0.22, bp: 5670, bph: 0.0,
  },
  {
    y0: 0.10, slope: 0.20, th: 145, alpha: 0.44, role: "bright",
    a1: 58, f1: 0.0036, p1: 4950, a2: 28, f2: 0.0082, p2: 6600,
    drift: 135, dp: 6325, ga: 36, gp: 8400, gph: 2.1, bd: 0.24, bp: 5110, bph: 1.7,
  },
  {
    y0: 0.03, slope: -0.11, th: 120, alpha: 0.37, role: "pale",
    a1: 43, f1: 0.0051, p1: 6875, a2: 23, f2: 0.011, p2: 5390,
    drift: 90, dp: 7700, ga: 26, gp: 6650, gph: 4.2, bd: 0.20, bp: 6020, bph: 3.4,
  },
  {
    y0: 0.36, slope: 0.28, th: 225, alpha: 0.30, role: "accent",
    a1: 65, f1: 0.0031, p1: 7700, a2: 33, f2: 0.007, p2: 5940,
    drift: 120, dp: 6875, ga: 39, gp: 9450, gph: 1.2, bd: 0.23, bp: 5460, bph: 5.1,
  },
  {
    y0: 0.62, slope: -0.16, th: 170, alpha: 0.32, role: "pale",
    a1: 44, f1: 0.0045, p1: 6200, a2: 20, f2: 0.009, p2: 7000,
    drift: 100, dp: 6800, ga: 26, gp: 7800, gph: 3.0, bd: 0.22, bp: 5400, bph: 2.2,
  },
];

/**
 * Desktop boost (W >= 700, run-7 iter 2 in-iteration tuning): the
 * strict motion critic PASSED mobile but FAILED the desktop pair
 * narrowly — at a glance the two desktop frames looked identical,
 * movement confined to faint wisps in the corners (top-left streak,
 * band crossing the ASCII bust), while the canvas metric claimed
 * 39.4% margin / 51.7% column change. Lesson recorded as a sign:
 * the canvas sampler measures raw canvas pixels, but the final
 * frame dims them (0.40 halo over the column + minS 0.34), so a big
 * canvas diff can still read as near-static to the eye — the eye
 * verdict governs, the metric is supporting evidence only. The
 * boost is the same treatment mobile got, milder: periods ×0.75,
 * drift ×1.3, wobble/glide ×1.2, brightness swing +0.04, alpha
 * ×1.15, in-column energy 0.34 → 0.50, halo 0.40 → 0.30. Same four
 * bands, same hue family, same soft look — no 5th low band on
 * desktop (its problem is faintness, not coverage).
 *
 * Desktop edge band — ATTEMPTED AND REVERTED in run-7 iter 5
 * (RUN7-MOTION-EDGE): a 5th narrow bright band was added to give
 * the desktop pair a trackable leading edge, first parallel to the
 * others (y0 0.18, slope +0.24), then counter-diagonal (y0 0.42,
 * slope −0.20) with a sharper sprite — and BOTH versions failed a
 * fresh strict critic at a glance (the band blends into the other
 * diffuse sheets; displacement in 3s is small vs band width, so old
 * and new positions overlap; the pair reads as brightness breathing,
 * pixel diff spread across the whole top half, mean |Δ| 7.3/255).
 * The band was reverted rather than shipped on a failed gate; the
 * rail guard in energy() (the one clear fix from the same iteration)
 * stays. The item remains open with the refined diagnosis: a
 * trackable object needs to be distinguishable AS an object —
 * sharper edge, clearly higher contrast than the parallel sheets,
 * and enough 3s displacement that old/new positions don't overlap —
 * without becoming a neon streak. That is a bigger redesign than a
 * parameter tweak, for a later iteration. The first version also
 * washed out the left-rail "Home" label when its bright core drifted
 * over the nav column (legibility critic, 3× crop confirmed) — which
 * is what the rail guard fixes.
 */
const DESKTOP_RIBBONS: ReadonlyArray<RibbonDef> = [
  {
    y0: -0.04, slope: 0.14, th: 205, alpha: 0.51, role: "deep",
    a1: 48, f1: 0.0042, p1: 8250, a2: 24, f2: 0.0095, p2: 10125,
    drift: 91, dp: 9750, ga: 29, gp: 7875, gph: 0.0, bd: 0.22, bp: 6075, bph: 0.0,
  },
  {
    y0: 0.10, slope: 0.20, th: 145, alpha: 0.46, role: "bright",
    a1: 55, f1: 0.0036, p1: 6750, a2: 26, f2: 0.0082, p2: 9000,
    drift: 117, dp: 8625, ga: 34, gp: 9000, gph: 2.1, bd: 0.24, bp: 5475, bph: 1.7,
  },
  {
    y0: 0.03, slope: -0.11, th: 120, alpha: 0.39, role: "pale",
    a1: 41, f1: 0.0051, p1: 9375, a2: 22, f2: 0.011, p2: 7350,
    drift: 78, dp: 10500, ga: 24, gp: 7125, gph: 4.2, bd: 0.20, bp: 6450, bph: 3.4,
  },
  {
    y0: 0.36, slope: 0.28, th: 225, alpha: 0.31, role: "accent",
    a1: 62, f1: 0.0031, p1: 10500, a2: 31, f2: 0.007, p2: 8100,
    drift: 104, dp: 9375, ga: 36, gp: 10125, gph: 1.2, bd: 0.23, bp: 5850, bph: 5.1,
  },
];

const WHITE: Rgb = { r: 255, g: 255, b: 255 };

/**
 * Per-section light chapters (run-7 iter 8, RUN7-EXP-CHAPTER-LIGHT).
 * A chapter is a small multiplier set over the base ribbon profile —
 * never new colors: slope/thickness/alpha/speed shift the geometry and
 * energy, pale/deep shift the role mix inside the live cyan family
 * (the roles themselves already derive from the theme tokens, so every
 * palette keeps working). The bright role is the peak carrier: a bright
 * lift raises the brightest band's peak — what the eye ranks chapters
 * by in a still — where a plain alpha lift only raises the mean.
 * Projects carries bright 1.5 after two mobile critics read it mid-pack
 * at 390px despite leading the canvas mean luma in every run. Ranges
 * are deliberately modest: the chapter should read as a change of light
 * as you move through the page, not as a new background per section.
 * Hero is the identity (the approved reference look); contact/epilogue
 * dim to close the journey.
 */
export interface ChapterProfile {
  /** Added to every band's slope (px drop per px across). */
  slope: number;
  /** Band thickness multiplier. */
  thick: number;
  /** Band alpha multiplier. */
  alpha: number;
  /** Phase-travel speed multiplier (accumulated, never a phase jump). */
  speed: number;
  /** Pale-role alpha multiplier (hue-family shift within the cyan). */
  pale: number;
  /** Deep-role alpha multiplier. */
  deep: number;
  /** Bright-role alpha multiplier — lifts the peak carrier band. */
  bright: number;
}

export const CHAPTER_PROFILES: Record<string, ChapterProfile> = {
  hero: { slope: 0, thick: 1, alpha: 1, speed: 1, pale: 1, deep: 1, bright: 1 },
  about: { slope: -0.04, thick: 0.9, alpha: 0.85, speed: 0.8, pale: 1.1, deep: 1, bright: 1 },
  publications: { slope: 0.05, thick: 1.1, alpha: 1, speed: 0.9, pale: 1.25, deep: 0.9, bright: 1 },
  experience: { slope: -0.03, thick: 1, alpha: 0.9, speed: 1, pale: 1, deep: 1.1, bright: 1 },
  projects: { slope: 0.06, thick: 1.15, alpha: 1.25, speed: 1.15, pale: 1, deep: 0.9, bright: 1.5 },
  skills: { slope: 0, thick: 0.85, alpha: 0.8, speed: 0.9, pale: 1, deep: 1, bright: 1 },
  contact: { slope: -0.05, thick: 0.9, alpha: 0.7, speed: 0.7, pale: 1.1, deep: 1, bright: 1 },
  epilogue: { slope: -0.05, thick: 0.9, alpha: 0.65, speed: 0.7, pale: 1.1, deep: 1, bright: 1 },
};

export function getChapterProfile(name: string | null): ChapterProfile {
  return CHAPTER_PROFILES[name ?? ""] ?? CHAPTER_PROFILES.hero;
}

export function lerpChapterProfile(
  a: ChapterProfile,
  b: ChapterProfile,
  k: number,
): ChapterProfile {
  return {
    slope: a.slope + (b.slope - a.slope) * k,
    thick: a.thick + (b.thick - a.thick) * k,
    alpha: a.alpha + (b.alpha - a.alpha) * k,
    speed: a.speed + (b.speed - a.speed) * k,
    pale: a.pale + (b.pale - a.pale) * k,
    deep: a.deep + (b.deep - a.deep) * k,
    bright: a.bright + (b.bright - a.bright) * k,
  };
}

/** The section owning the viewport center, from measured rects. */
export function resolveActiveChapter(
  rects: ReadonlyArray<{ name: string; top: number; bottom: number }>,
  centerY: number,
  atBottom = false,
): string | null {
  // At the very bottom of the page the last chapter owns the viewport:
  // the epilogue footer is shorter than half the viewport, so the
  // center can never fall inside it — without this its profile would
  // be unreachable.
  if (atBottom && rects.length > 0) return rects[rects.length - 1].name;
  let fallback: string | null = null;
  for (const rect of rects) {
    if (rect.top <= centerY && rect.bottom >= centerY) return rect.name;
    if (rect.top <= centerY) fallback = rect.name;
  }
  // In a gap between sections, keep the last one scrolled past; above
  // the first section, the first section owns the center.
  return fallback ?? rects[0]?.name ?? null;
}


function probeTokenColor(token: string): Rgb | null {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const raw = getComputedStyle(probe).color;
  probe.remove();
  const m = raw.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  // color(srgb r g b) serializes channels as 0..1 floats; rgb() as 0..255.
  const scale = raw.startsWith("color(") ? 255 : 1;
  return {
    r: Math.round(parseFloat(m[0]) * scale),
    g: Math.round(parseFloat(m[1]) * scale),
    b: Math.round(parseFloat(m[2]) * scale),
  };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function scaleRgb(c: Rgb, f: number): Rgb {
  return {
    r: Math.round(c.r * f),
    g: Math.round(c.g * f),
    b: Math.round(c.b * f),
  };
}

function rgba(c: Rgb, a: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a.toFixed(3)})`;
}

/** One ribbon family's colors, derived from the live accent tokens. */
function resolveRibbonColors(
  accent: Rgb,
  glow: Rgb,
): Record<RibbonRole, Rgb> {
  return {
    deep: scaleRgb(accent, 0.55),
    bright: mix(accent, WHITE, 0.28),
    pale: glow,
    accent,
  };
}

function makeSprite(rgb: Rgb): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 2;
  c.height = 128;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, rgba(rgb, 0));
  grad.addColorStop(0.3, rgba(rgb, 0.35));
  grad.addColorStop(0.5, rgba(rgb, 0.92));
  grad.addColorStop(0.7, rgba(rgb, 0.35));
  grad.addColorStop(1.0, rgba(rgb, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 128);
  return c;
}

/**
 * Flare head sprite (run-7 iter 7, RUN7-MOTION-FLARE): a compact
 * radial glow — near-white core, bright mid, accent falloff — drawn
 * sharp on the main canvas, never through the blur pass, so the head
 * reads as a distinct object against the soft sheets.
 */
function makeFlareSprite(bright: Rgb, accent: Rgb): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  grad.addColorStop(0.0, rgba(mix(bright, WHITE, 0.45), 1));
  grad.addColorStop(0.28, rgba(bright, 0.95));
  grad.addColorStop(0.5, rgba(accent, 0.35));
  grad.addColorStop(1.0, rgba(accent, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 96, 96);
  return c;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function LightRibbons() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Record<RibbonRole, HTMLCanvasElement> | null>(
    null,
  );
  const flareSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const bgRef = useRef<Rgb>({ r: 5, g: 7, b: 12 });
  const accentRef = useRef<Rgb>({ r: 125, g: 211, b: 252 });
  // Under reduced motion there is no loop to pick up rebuilt sprites, so
  // the canvas effect registers a static-frame repaint here that the
  // probe effect below calls after every theme/palette change.
  const repaintStaticRef = useRef<(() => void) | null>(null);
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();

  // Probe the live theme tokens and rebuild the ribbon sprites. The
  // draw loop reads these refs, so a palette switch takes effect on the
  // next frame without remounting the canvas; under reduced motion the
  // static frame is repainted explicitly.
  //
  // RUN7-LIGHT-PROBE (run-7 iter 4): this MUST also run AFTER the
  // canvas effect sets data-ascii="active" (see the call site there).
  // The FROST remap only applies while that attribute is set, so a
  // probe taken before the claim reads PRE-remap tokens: in light mode
  // --background is #f3f7fc instead of the remapped #05070c (the halo
  // then painted a light wash over the dark page and ribbons fell back
  // to source-over at halved alpha), --effect-glow is #3f4856 instead
  // of pale cyan, and a non-default palette's accent is un-collapsed.
  // The probe effect below runs before the canvas effect on mount
  // (declaration order), so without the post-claim re-probe the first
  // frames — and every frame until a theme/palette change — used stale
  // tokens. Re-probing after the claim makes mount-time values match
  // what later theme changes already read.
  const probeThemeTokens = useCallback(() => {
    const accent =
      probeTokenColor("--accent-neon") ?? { r: 125, g: 211, b: 252 };
    const glow =
      probeTokenColor("--effect-glow") ?? { r: 186, g: 230, b: 253 };
    const bg = probeTokenColor("--background") ?? { r: 5, g: 7, b: 12 };
    accentRef.current = accent;
    bgRef.current = bg;
    const colors = resolveRibbonColors(accent, glow);
    spritesRef.current = {
      deep: makeSprite(colors.deep),
      bright: makeSprite(colors.bright),
      pale: makeSprite(colors.pale),
      accent: makeSprite(colors.accent),
    };
    flareSpriteRef.current = makeFlareSprite(colors.bright, colors.accent);
    repaintStaticRef.current?.();
  }, []);

  // Re-probe theme colors and rebuild sprites whenever theme or palette
  // changes.
  useEffect(() => {
    if (!resolvedTheme) return;
    probeThemeTokens();
  }, [resolvedTheme, palette, probeThemeTokens]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !resolvedTheme) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const off = document.createElement("canvas");
    const octx = off.getContext("2d");
    if (!octx) return;
    // Per-draw ctx.filter blur is the final softening pass. Detect on the
    // prototype — assigning the property on an unsupported context would
    // silently create an expando and lie.
    const filterOK =
      typeof CanvasRenderingContext2D !== "undefined" &&
      "filter" in CanvasRenderingContext2D.prototype;

    const root = document.documentElement;
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    // Claim the background immediately so EffectStage never flashes the
    // shader backdrop under the ribbons.
    root.dataset.journey = "active";
    let disposed = false;
    let raf = 0;

    const S = 0.5;
    let W = 0;
    let H = 0;
    let colL = 0;
    let colR = 0;

    // Chapter state (RUN7-EXP-CHAPTER-LIGHT): the profile currently
    // rendered, the one it is lerping from/to, and the tween start.
    // A chapter change re-bases `from` on the CURRENT interpolated
    // values, so a mid-tween re-target cancels the stale tween instead
    // of queueing behind it; scrolling back re-targets the earlier
    // chapter, so the whole system is exactly reversible.
    let chapterCur: ChapterProfile = { ...CHAPTER_PROFILES.hero };
    let chapterFrom: ChapterProfile = chapterCur;
    let chapterTarget: ChapterProfile = chapterCur;
    let chapterTweenStart = 0;
    let chapterActive = "hero";
    // Chapter time: the ribbon phase clock. It accumulates wall time
    // scaled by the current chapter's speed, so a speed change bends
    // the phase rate instead of jumping the phase.
    let tChapter = 12000;
    let lastT = 0;
    let lastScrollY = -1;
    let lastH = -1;

    /** Resolve the section owning the viewport center (cheap: rects
     * are re-read only when the scroll position or height changed). */
    const updateChapter = (now: number) => {
      if (window.scrollY === lastScrollY && H === lastH) return;
      lastScrollY = window.scrollY;
      lastH = H;
      const rects = Array.from(
        document.querySelectorAll("[data-light-chapter]"),
      ).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.getAttribute("data-light-chapter") ?? "hero",
          top: r.top,
          bottom: r.bottom,
        };
      });
      const active = resolveActiveChapter(
        rects,
        window.innerHeight / 2,
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2,
      );
      if (!active || active === chapterActive) return;
      chapterActive = active;
      chapterFrom = { ...chapterCur };
      chapterTarget = getChapterProfile(active);
      chapterTweenStart = now;
      // Probe hook for verification (and for any future chapter-aware
      // chrome): the canvas always names its active chapter.
      canvas.dataset.activeChapter = active;
      // Reduced motion has no tween: the static frame snaps to the
      // active chapter's profile immediately. `from` snaps too, so the
      // stepChapter lerp below (k = 0 on this frame) cannot pull the
      // rendered profile back to the previous chapter.
      if (reduced) {
        chapterCur = { ...chapterTarget };
        chapterFrom = { ...chapterTarget };
      }
    };

    /** Advance the ~600ms crossfade toward the active chapter. */
    const stepChapter = (now: number) => {
      const k = Math.min(1, (now - chapterTweenStart) / 600);
      chapterCur = lerpChapterProfile(chapterFrom, chapterTarget, smooth(0, 1, k));
    };

    /** Content column: the hero editorial measure every section shares.
     * Inset by the element's inline padding so the TEXT zone (not the
     * padded box) defines suppression — on a 390px viewport the box
     * spans the full width, which left no full-energy margin at all and
     * the motion pair read static at the edges. */
    const measure = () => {
      const el = document.querySelector("[data-hero-editorial]");
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pr = parseFloat(cs.paddingRight) || 0;
        colL = r.left + pl;
        colR = r.right - pr;
        return;
      }
      // Fallback: the centered 1200px measure from --journey-content-max.
      const maxRaw =
        getComputedStyle(root).getPropertyValue("--journey-content-max");
      const max = parseFloat(maxRaw) || 1200;
      const pad = Math.min(64, Math.max(16, W * 0.05));
      const half = Math.min(W / 2 - pad, max / 2);
      colL = W / 2 - half;
      colR = W / 2 + half;
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      off.width = Math.max(2, Math.ceil(W * S));
      off.height = Math.max(2, Math.ceil(H * S));
      measure();
    };

    // Ribbon energy multiplier at a point: suppressed inside the content
    // column (feathered edges), fading gently with depth down the viewport.
    const energy = (x: number, y: number): number => {
      const F = 150;
      // Narrow screens: less suppression inside the column — the text is
      // large there and the bands need to stay visible at phone scale
      // (RUN7-MOTION-VIS: 0.6 left the column a faint haze; 0.78 puts
      // real light where the pixels are, halo still guards legibility).
      // Desktop: 0.50 after the strict critic failed the desktop pair
      // (in-iteration tuning — the 0.34 column read as near-static).
      const minS = W < 700 ? 0.78 : 0.5;
      let sx: number;
      if (x < colL) sx = minS + (1 - minS) * smooth(0, F, colL - x);
      else if (x > colR) sx = minS + (1 - minS) * smooth(0, F, x - colR);
      else sx = minS;
      // Rail guard (desktop only, run-7 iter 5 in-iteration tuning):
      // the left rail's small muted labels (x ≈ 8–110) washed out when
      // the bright edge band's core drifted over them (legibility critic,
      // 3× crop: "Home" pale-on-pale in v7iter5-desktop-about). Cap the
      // ribbon energy over that strip — ~0.30 at the text, feathering to
      // full by x ≈ 260 — so even the brightest band stays legible there.
      // Inside the column the cap never binds (minS 0.50 is lower), and
      // the top glow is painted separately, unaffected.
      if (W >= 700 && x < 260) {
        sx = Math.min(sx, 0.3 + 0.7 * smooth(0, 260, x));
      }
      const vf = 1 - 0.5 * smooth(H * 0.12, H * 0.85, y);
      return sx * vf;
    };

    const centerY = (r: RibbonDef, x: number, ct: number): number => {
      const ph = r.drift * Math.sin((ct * 6.2832) / r.dp);
      return (
        r.y0 * H +
        (r.slope + chapterCur.slope) * x +
        r.ga * Math.sin((ct * 6.2832) / r.gp + r.gph) +
        r.a1 * Math.sin((x + ph) * r.f1 + (ct * 6.2832) / r.p1) +
        r.a2 * Math.sin((x - ph * 0.6) * r.f2 - (ct * 6.2832) / r.p2)
      );
    };

    const thick = (r: RibbonDef, x: number, ct: number): number =>
      r.th *
      chapterCur.thick *
      (0.78 +
        0.22 *
          Math.sin(
            x * 0.0021 + (ct * 6.2832) / (W < 700 ? 6900 : 9375),
          ));

    const draw = (t: number) => {
      const sprites = spritesRef.current;
      if (!sprites) return;
      // Chapter clock: advance the ribbon phase at the current
      // chapter's speed, and crossfade toward the active chapter's
      // profile. dt is clamped so a hidden-tab gap never jumps the
      // phase (the loop also pauses on visibilitychange).
      const dt = lastT > 0 ? Math.min(100, Math.max(0, t - lastT)) : 0;
      lastT = t;
      updateChapter(t);
      stepChapter(t);
      tChapter += dt * chapterCur.speed;
      const bg = bgRef.current;
      const accent = accentRef.current;
      // Composite off the PROBED background luminance, not the theme
      // setting: the FROST remap forces a dark page while the ribbons
      // animate even when the visitor chose light mode, and that page
      // must get additive ribbons; a genuinely light page (reduced
      // motion, remap off) gets normal compositing at halved alpha,
      // since additive would wash out on it.
      const bgLum = (0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b) / 255;
      const dark = bgLum < 0.5;
      // Light mode: normal compositing at halved alpha (additive would
      // wash out on a light background). Dark mode: additive, as approved.
      const alphaScale = dark ? 1 : 0.5;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      // A whisper of top glow, in the live accent.
      const top = ctx.createLinearGradient(0, 0, 0, H * 0.5);
      top.addColorStop(0, rgba(accent, dark ? 0.12 : 0.06));
      top.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, W, H * 0.5);

      // Ribbons on the half-res offscreen, additive in dark mode.
      // Narrow screens use the faster, wider-travel profile (+ low band);
      // desktop uses the boosted profile (in-iteration tuning, iter 2).
      const list = W < 700 ? NARROW_RIBBONS : DESKTOP_RIBBONS;
      octx.clearRect(0, 0, off.width, off.height);
      octx.globalCompositeOperation = dark ? "lighter" : "source-over";
      const step = 1; // offscreen px (~2 css px) — dense slices, no striping
      for (let ri = 0; ri < list.length; ri++) {
        const r = list[ri];
        // Brightness breathing: gentle intensity swell, ±16–20% over ~7–9s.
        // Chapter multipliers: overall alpha + the pale/deep role mix.
        const roleScale =
          r.role === "bright"
            ? chapterCur.bright
            : r.role === "pale"
              ? chapterCur.pale
              : r.role === "deep"
                ? chapterCur.deep
                : 1;
        const ba =
          r.alpha *
          alphaScale *
          chapterCur.alpha *
          roleScale *
          (1 + r.bd * Math.sin((tChapter * 6.2832) / r.bp + r.bph));
        for (let ox = 0; ox < off.width; ox += step) {
          const xCss = (ox + step / 2) / S;
          const cCss = centerY(r, xCss, tChapter);
          const a = ba * energy(xCss, cCss);
          if (a < 0.004) continue;
          const thPx = thick(r, xCss, tChapter) * S;
          octx.globalAlpha = Math.min(1, a);
          octx.drawImage(
            sprites[r.role],
            ox,
            cCss * S - thPx / 2,
            step + 1,
            thPx,
          );
        }
      }
      octx.globalAlpha = 1;
      if (filterOK) {
        try {
          ctx.filter = "blur(4px)";
        } catch {
          /* unsupported — ribbons render crisp, no crash */
        }
      }
      ctx.drawImage(off, 0, 0, W, H);
      if (filterOK) {
        try {
          ctx.filter = "none";
        } catch {
          /* ignore */
        }
      }

      // Soft dark halo over the content column: text stays crisp anywhere.
      // Lighter on narrow screens, where it would otherwise dim the whole
      // viewport (the column spans it) and hide the bands at phone scale
      // (RUN7-MOTION-VIS: 0.25 → 0.15 so the faster bands read through).
      // Desktop 0.40 → 0.30 (in-iteration tuning: the 0.40 halo dimmed
      // the column bands to near-invisible in the final frame).
      const haloA = W < 700 ? 0.15 : 0.3;
      const F2 = 150;
      const colW = Math.max(1, colR - colL);
      const GL = colW + 2 * F2;
      const halo = ctx.createLinearGradient(colL - F2, 0, colR + F2, 0);
      halo.addColorStop(0, rgba(bg, 0));
      halo.addColorStop(F2 / GL, rgba(bg, haloA));
      halo.addColorStop((F2 + colW) / GL, rgba(bg, haloA));
      halo.addColorStop(1, rgba(bg, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      // Traveling flare (run-7 iter 7, RUN7-MOTION-FLARE): one compact
      // bright head + short fading tail riding the central "bright"
      // band's centerline. The head moves ~180px/s desktop (~90 narrow
      // — see the header note: at 140px/s the narrow head crossed the
      // whole 390px viewport between the pair's frames, so no 3s-apart
      // pair could show it twice), so in 3s it travels ~540px desktop
      // (~270 narrow) — old and new positions do not overlap, which is
      // what the two reverted edge bands failed (their 3s displacement
      // was small vs band width). One crossing every ~12s (desktop) with
      // a 3s pause and fade in/out at the ends — intermittent, never a
      // permanent neon line. Drawn SHARP
      // on the main canvas after the blur pass (Codrops sharp core over
      // blurred glow), additive in dark mode. energy() applies, so the
      // column suppression and rail guard cap the flare exactly as they
      // cap the bands. It is drawn AFTER the halo on purpose (in-
      // iteration tuning): the first version drew it before the halo and
      // the 0.30 column halo dimmed the head to +38 luma over the band
      // (152 vs 114) — invisible at a glance. After the halo the head
      // reads ~210 luma in the column; it stays behind the DOM text and
      // crosses any given word in ~0.3s, so legibility is verified on
      // the about frames, not assumed. Second desktop tuning (same
      // iteration): two fresh strict critics SPLIT on desktop — one
      // PASSED the head as a trackable knot, the other FAILED frame A
      // as a diffuse elongated glow (head near the left edge merges
      // with the band + half-off-screen tail) with a competing bright
      // speck that is actually the nav's active-item marker (stationary
      // DOM chrome, misread). A 1–1 split on a borderline frame is not
      // a robust pass, so the desktop head got bigger (34 → 44px
      // radius), the tail tighter (34 → 26px spacing) and the sprite's
      // bright core wider (0.18 → 0.28 stop) — the same prescription
      // the mobile FAIL drew. Under reduced motion the flare
      // is ABSENT — the static frame shows only the sheets.
      if (!reduced) {
        const flareSprite = flareSpriteRef.current;
        const host = list.find((b) => b.role === "bright") ?? list[0];
        if (flareSprite && host) {
          const narrow = W < 700;
          const speed = narrow ? 90 : 180; // css px per second
          const dist = W + 300;
          const crossMs = (dist / speed) * 1000;
          const pauseMs = 3000;
          const cycle = crossMs + pauseMs;
          // t is the rAF timestamp (same clock as performance.now()), so
          // the flare phase is deterministic from page load.
          const ph = t % cycle;
          if (ph < crossMs) {
            const s = ph / crossMs;
            const env = smooth(0, 0.12, s) * (1 - smooth(0.88, 1, s));
            const headX = -150 + s * dist;
            const headY = centerY(host, headX, tChapter);
            const headR = narrow ? 30 : 44;
            const spacing = narrow ? 20 : 26;
            ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
            // Tail first: fading ghosts behind the head along the band.
            for (let k = 5; k >= 1; k--) {
              const tx = headX - k * spacing;
              const ty = centerY(host, tx, tChapter);
              const a = env * 0.5 * (1 - k / 6) * energy(tx, ty);
              if (a < 0.004) continue;
              const d = headR * (1 - k / 8) * 2;
              ctx.globalAlpha = Math.min(1, a);
              ctx.drawImage(flareSprite, tx - d / 2, ty - d / 2, d, d);
            }
            const ha = env * 1.0 * energy(headX, headY);
            if (ha >= 0.004) {
              const d = headR * 2;
              ctx.globalAlpha = Math.min(1, ha);
              ctx.drawImage(flareSprite, headX - d / 2, headY - d / 2, d, d);
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
          }
        }
      }
    };

    const loop = (now: number) => {
      if (disposed) return;
      if (!document.hidden) draw(now || 0);
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) {
        // Pause the work, not only the pixels: cancel the tick so no frame
        // is scheduled while hidden. The browser would pause rAF anyway;
        // cancelling makes the resume deterministic.
        cancelAnimationFrame(raf);
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (reduced) draw(12000);
      }, 150);
    };

    resize();
    // Reduced motion: the static frame follows the active chapter —
    // a discrete repaint on scroll (debounced, only when the chapter
    // actually changes — updateChapter snaps chapterCur to the new
    // target), never an animation.
    let reducedScrollTimer = 0;
    const onReducedScroll = () => {
      window.clearTimeout(reducedScrollTimer);
      reducedScrollTimer = window.setTimeout(() => {
        if (disposed) return;
        draw(12000);
      }, 150);
    };
    if (reduced) {
      draw(12000); // one deliberate still frame; bust stays absent by design
      // Palette/theme changes under reduced motion repaint the static
      // frame (there is no loop to pick up rebuilt sprites).
      repaintStaticRef.current = () => {
        if (disposed) return;
        resize();
        draw(12000);
      };
      window.addEventListener("scroll", onReducedScroll, { passive: true });
    } else {
      root.setAttribute("data-ascii", "active");
      // RUN7-LIGHT-PROBE: re-probe NOW, after the claim — the remap
      // applies from this line on, so this is the first probe that
      // reads the remapped tokens. Runs synchronously before the first
      // rAF draw, so no frame ever paints with stale tokens. The draw
      // loop reads bgRef/spritesRef per frame, so no remount is needed.
      probeThemeTokens();
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(reducedScrollTimer);
      repaintStaticRef.current = null;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onReducedScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      if (root.getAttribute("data-ascii") === "active") {
        root.removeAttribute("data-ascii");
      }
      if (root.dataset.journey === "active") {
        delete root.dataset.journey;
      }
    };
  }, [resolvedTheme, probeThemeTokens]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="light-ribbons"
      data-light-ribbons
    />
  );
}
