"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import { GLYPHS } from "@/components/effects/floating-glyphs";
import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import { BLUE_NOISE_128 } from "@/lib/blue-noise";
import {
  getBustTravelBox,
  streamGlyphHiddenByBust,
} from "@/lib/bust-travel";
import {
  CLICK_PULSE_TAIL_COUNT,
  clickPulseActive,
  clickPulseEnergyAt,
  clickPulseHead,
  clickPulseHeadRadius,
  clickPulseSpawn,
  clickPulseTail,
  type ClickPulse,
} from "@/lib/click-pulse";

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
 *   Run-10 iter 35 (RUN10-PRESETS) extends each chapter with a Wayloom
 *   preset palette (small hue rotation + tint mix, same cyan-family
 *   discipline) and a field mode (Halo/Central/Edge Glass/Diagonal
 *   geometry) — both lerped through the same ~600ms crossfade, so a
 *   chapter change visibly shifts the light's color AND shape.
 * - Dither seam (run-7 iter 10, RUN7-EXP-DITHER): a blue-noise
 *   dissolve at the hero's lower edge — the ribbon light halftones
 *   out across a 96px band centered on the hero's bottom edge, so the
 *   page crosses from hero into about through a printed dissolve
 *   instead of a hard light cut; the level is symmetric (1 at the
 *   edge, 0 at both band ends) so the next section's light fades back
 *   in with no hard edge. One bounded seam, not scattered
 *   texture: it uses the site's own 128x128 blue-noise threshold tile
 *   (lib/blue-noise.ts — the same grammar as the glyph field's object
 *   dissolves, isotropic grain, no Bayer cross-hatch), dots are the
 *   probed background color (theme tokens only), and the strip rides
 *   the hero edge as you scroll. The dots sit behind the DOM and can
 *   only dim the light behind text, never cover it.
 * - Scroll scrub (run-7 iter 14, RUN7-EXP-SCROLL-SCRUB): scroll
 *   position scrubs the ribbon phase — a scroll-progress offset
 *   t in [0,1] (pure function of scrollY / maxScroll, exponential-
 *   chase smoothed like Talreja's UniverseClock, reversible on
 *   scroll-up so the light rewinds) added to the ambient wall-clock
 *   phase, so scrolling the page visibly advances/rewinds the light
 *   while ambient motion continues at rest; a full-page scroll is
 *   1.25 phase cycles. Phase only — no color, alpha or energy change,
 *   so the 2+1 discipline and the legibility envelope are untouched;
 *   reduced motion = static (scrub disabled, the reduced repaint
 *   already repositions on scroll). The flare rides the scrubbed
 *   band's centerline, so it stays on its band while scrolling.
 * - Scroll velocity (run-7 iter 16, RUN7-EXP-SCROLL-VELOCITY):
 *   the ribbons answer the SCROLL ITSELF, not just the position —
 *   while the page is moving, the phase-travel rate surges (up to
 *   7x at full envelope) and the drift amplitude grows (up to 3x),
 *   then both settle back to ambient at rest (fast attack ~8/s,
 *   slow decay ~1.2/s). DISTINCT from scrub (a positional phase
 *   offset that persists at a scroll position) and from chapters (a
 *   discrete profile toggle): this is a transient RATE effect that
 *   exists only while scrolling and decays to zero at rest. The
 *   velocity is measured against wall-clock frame time, not the
 *   clamped frame dt — the clamp would over-read velocity on slow
 *   frames and pin the envelope at 1 for any scroll. The boost is
 *   deliberately LARGE (in-iteration tuning: at +2x the A/B rate was
 *   only 1.29-1.34x and two fresh strict critics could not tell the
 *   new build from the old in stills — a rate change has to be big
 *   to read as a response, not a shimmer). Rate only — no alpha or
 *   energy change, so the legibility envelope (column suppression,
 *   rail guard, halo) is untouched; reduced motion = static
 *   (velocity never sampled, no rAF loop).
 *
 * - Time-of-day light sets (run-7 iter 20, RUN7-EXP-DAYLIGHT): the
 *   ribbon layer gets four sets keyed to the visitor's LOCAL hour
 *   (morning/day/dusk/night, after Bruno Simon's rebuilt portfolio,
 *   which defines a colour set per time of day and fades gradually
 *   between phases). The sets stay inside the cyan family + live
 *   theme tokens — same hues, shifting only lightness/energy/role-
 *   mix (day = brighter pale ribbons + higher alpha, night = deeper
 *   blues + dimmer ambient + stronger flare contrast) — so the 2+1
 *   discipline holds and no new hue enters. The set lerps gradually
 *   on mount (identity → active set, ~0.6/s chase) and at hour
 *   boundaries; reduced motion = static frame of the active set
 *   (the repaint snaps to the target, no animation). DISTINCT from
 *   chapters (scroll position), scrub/velocity (scroll coupling):
 *   this is the light telling a story about WHEN you visit, and it
 *   changes even at rest.
 *
 * - Opening ring-of-light reveal (run-7 iter 22, RUN7-EXP-REVEAL):
 *   on first mount a soft radial ring expands from the hero center
 *   across the canvas over ~2s — after Bruno Simon's rebuilt
 *   portfolio, which opens with "a thin glowing ring pushing
 *   outward, lighting the island bit by bit over ~2s". The ribbons
 *   fade in BEHIND the ring's edge (a per-slice reveal factor), so
 *   the light is born at the hero center and blooms outward instead
 *   of snapping on; the ring then dissolves and the reveal is done
 *   for the life of the mount (a theme change remounts the effect
 *   and replays the entrance — a deliberate encore, not a bug).
 *   Background-layer only, one-shot, no new copy, no gated
 *   interaction. The ring is drawn BEFORE the column halo (unlike
 *   the flare, which sits after it): the halo softens the wavefront
 *   over the text column so it never washes BERAT or the rail
 *   labels, while the margins and edges carry the full ring. It does
 *   NOT fight the BERAT decode intro — the ring lives under the
 *   text, and the decode is DOM text the canvas never touches.
 *   Reduced motion = no ring, static frame as now. BOOT INTERACTION
 *   (verified in-iteration): on a desktop FIRST visit the BIOS boot
 *   overlay (components/effects/boot-sequence.tsx) covers the hero
 *   with an opaque panel for 2.6s + 0.45s fade — the whole 2s reveal
 *   would play behind it and no visitor would ever see the ring
 *   bloom. So when a boot is expected (fine pointer, wide viewport,
 *   no `bercev-has-booted` flag — the boot's own conditions), the
 *   reveal clock does not start until the overlay has been seen in
 *   the DOM and then left it (click-to-skip unmounts early, so the
 *   reveal follows the skip), or 3.5s after mount as a safety cap.
 *   On repeat visits and phones the boot never plays and the reveal
 *   starts on mount; as a side benefit the reveal now starts AFTER
 *   the BERAT decode intro on desktop first visits instead of racing
 *   it.
 *
 * - Living ASCII glyph stream (run-7 iter 32, RUN7-EXP-GLYPH-STREAM
 *   v2): the site's own GLYPHS vocab flows along the bright band's
 *   centerline at ~165px/s, margins only, desktop only. v1 (iter 29)
 *   tied glyph alpha to the flare envelope and read as intermittent
 *   (one phase near-invisible, another 11x) — reverted after two
 *   strict-motion FAILs. v2 floors the alpha at 0.6, coupled only to
 *   the band's own ±20% breathing, and answers the 1440px margin
 *   width with dense 36px spacing (2–3 glyphs in the ~96px right
 *   margin at once) plus ~495px of travel in a 3s pair, so the pair
 *   shows a wholly different constellation.
 *
 * - Click pulse (run-10 iter 31, RUN10-CLICK-PULSE, React Bits Soft
 *   Aurora behavior: "clicks send a pulse of light along it"): a
 *   pointer click anywhere spawns a bright head + fading tail at the
 *   click point that travels +x along the bright band's effective
 *   slope for ~1.8s (~420px/s desktop, ~300 narrow), drawn sharp on
 *   the main canvas after the flare so it is the brightest object —
 *   the react half of the charter's "light that flows, reacts, and
 *   carries the page". Distinct from SPARKLE's hover burst (a radial
 *   burst AT the pointer) and from the ambient flare (a slow periodic
 *   crossing): this one is click-triggered, faster, bigger, brighter,
 *   and starts exactly where the pointer landed. The tail grows
 *   behind the head as it travels (lib/click-pulse.ts), so at spawn
 *   the pulse is a point, not a pre-drawn smear. Up to 4 concurrent
 *   pulses; the oldest is dropped, never queued. Reduced motion =
 *   absent (no listener, no pulses, static frame untouched).
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

export interface RibbonDef {
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
 * Run-10 iter 35 (RUN10-PRESETS) adds a preset palette + field mode
 * per chapter (see LIGHT_PRESETS / FIELD_MODES below): the preset is a
 * small hue/tint shift in the same cyan-family discipline, the mode is
 * a lerpable geometry change — both crossfade with the chapter tween.
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
  /** Wayloom preset palette name (RUN10-PRESETS) — label only; the
   * numbers below are what render, so the chapter crossfade lerps
   * them instead of snapping the palette. */
  preset: LightPresetName;
  /** Field-mode name (RUN10-PRESETS) — label only, same as preset. */
  mode: FieldModeName;
  /** Preset hue rotation in degrees, applied to every role color. */
  hue: number;
  /** Preset tint the role colors mix toward. */
  tint: Rgb;
  /** Preset tint mix in [0, 1]. */
  tintMix: number;
  /** Field-mode pull of band y0 toward the vertical center: 1 puts
   * every band at the center, -1 pushes them to the edges. */
  centerPull: number;
  /** Field-mode slope spread multiplier: 1 keeps the base slopes. */
  fan: number;
  /** Field-mode y0 spread multiplier around the center. */
  spread: number;
  /** Field-mode mirror weight for the lowest band (see FieldMode). */
  mirror: number;
  /** Field-mode bottom pull for the lowest band (see FieldMode):
   * 1 pulls the folded band to the 0.85H anchor, 0 leaves the
   * center mirror alone. */
  bottomPull: number;
}

/**
 * Per-chapter Wayloom light presets (run-10 iter 35, RUN10-PRESETS).
 * The reel's named presets (Aurora, Ice Halo, Golden Hour, Cobalt
 * Wave) rebuilt as small tints inside the live cyan family — the same
 * discipline as the daylight sets (modest multipliers, no new hue):
 * a hue rotation of at most ±16° plus a ≤0.6 mix toward a tint color.
 * The tint carries the preset's character (Golden Hour warms toward
 * gold, Cobalt Wave deepens toward blue); the mix is small enough that
 * every chapter still reads as the site's FROST cyan, just warmer,
 * cooler, greener, or deeper. (Fix1: the first values — ±10° / ≤0.25
 * — were pixel-measurable but invisible to the eye at 390px behind
 * the column suppression and the content panels; both critics failed
 * them. Fix2: Golden Hour's mix goes to 0.6 toward a deeper amber
 * gold (255,170,80) because at 0.45 the base cyan's green channel
 * still dominated and the chapter read olive, not golden — gold needs
 * red to lead green, and the -10° hue rotation itself raises green,
 * so the tint has to be red enough to outrun it (a (255,190,100)
 * tint still left green ahead 207–203). Aurora goes to 0.4 so
 * the green-vs-ice distinction reads; iceHalo goes to 0.6 (fix5:
 * at 0.4 the desktop critic + two phase samples read experience /
 * epilogue as lights-off — the pale tint over the dim chapter
 * profiles fell below the glance threshold, the same fix2 lesson as
 * gold. 0.6 lets the ice-white tint carry the identity; the
 * aurora-vs-ice blue-lead test still holds with margin). The tints stay inside the cyan family — blue and
 * green still dominate every role color except goldenHour's accent,
 * whose red lead IS the golden hour — but now move the channels far
 * enough to read at a glance.) `frost` is the identity preset — the
 * hero keeps the approved reference colors exactly and takes only the
 * Halo field mode (the item names "hero Halo", not a hero recolor).
 * wayloom.com itself is DOWN (verified iter 6) — the reel's preset/mode
 * names + this engine are the source; nothing is fetched from the site.
 */
export type LightPresetName =
  | "frost"
  | "aurora"
  | "iceHalo"
  | "goldenHour"
  | "cobaltWave";

export interface LightPreset {
  /** Hue rotation in degrees applied to every role color. */
  hue: number;
  /** Tint the role colors mix toward. */
  tint: Rgb;
  /** Mix amount in [0, 1]. */
  tintMix: number;
}

export const LIGHT_PRESETS: Record<LightPresetName, LightPreset> = {
  // Identity: hue 0, mix 0 — the tint value is unused, it only fills
  // the shape so the hero profile stays a plain preset spread.
  frost: { hue: 0, tint: { r: 125, g: 211, b: 252 }, tintMix: 0 },
  aurora: { hue: -14, tint: { r: 110, g: 255, b: 205 }, tintMix: 0.4 },
  iceHalo: { hue: 12, tint: { r: 220, g: 240, b: 255 }, tintMix: 0.6 },
  goldenHour: { hue: -10, tint: { r: 255, g: 170, b: 80 }, tintMix: 0.6 },
  cobaltWave: { hue: 16, tint: { r: 80, g: 130, b: 255 }, tintMix: 0.38 },
};

/**
 * Field modes (run-10 iter 35, RUN10-PRESETS) — the reel's named
 * modes (Central, Edge Glass, Halo, Diagonal) as lerpable geometry
 * numbers over the base ribbon defs. Central gathers the bands toward
 * the middle; Edge Glass pushes them to the top/bottom edges so the
 * middle reads as glass; Halo gathers them into a loose ring band
 * around the center; Diagonal fans the slopes into strong diagonals.
 * All three numbers lerp through the chapter crossfade, so a mode
 * change is a visible reconfiguration, not a snap.
 */
export type FieldModeName = "halo" | "central" | "edgeGlass" | "diagonal";

export interface FieldMode {
  /** Pull of band y0 toward the vertical center (1 = all at center,
   * -1 = pushed to the edges). */
  centerPull: number;
  /** Slope spread multiplier (1 = base slopes, 2 = strong diagonals). */
  fan: number;
  /** y0 spread multiplier around the center (1 = base spread). */
  spread: number;
  /** Mirror weight in [0, 1] for the LOWEST band (run-10 iter 35
   * fix1): when the mode's transform still leaves that band above
   * the center, the band folds across the center toward its mirror
   * position — lerped, so a chapter crossfade sweeps the band down
   * instead of snapping it. Halo and Edge Glass mirror (a ring and a
   * frame both need light below the center); Central and Diagonal do
   * not. Without it the desktop profile — whose bands all start in
   * the top half — could never put light at the bottom edge, and
   * Edge Glass read as a missing background (both critics, fix1). */
  mirror: number;
  /** Bottom pull in [0, 1] for the LOWEST band (run-10 iter 35
   * fix3): after the center mirror, pulls the folded band toward
   * the 0.85H anchor — the frame's bottom band must REST in the
   * bottom third. Only Edge Glass pulls (a frame needs its bottom
   * edge lit); Halo's ring stays at the center mirror. Lerped, so
   * a halo→edgeGlass crossfade sweeps the band down smoothly. */
  bottomPull: number;
}

export const FIELD_MODES: Record<FieldModeName, FieldMode> = {
  halo: { centerPull: 0.45, fan: 0.9, spread: 0.75, mirror: 1, bottomPull: 0 },
  central: { centerPull: 0.65, fan: 0.4, spread: 0.7, mirror: 0, bottomPull: 0 },
  edgeGlass: { centerPull: -0.55, fan: 0.5, spread: 1.15, mirror: 1, bottomPull: 1 },
  diagonal: { centerPull: 0, fan: 2.4, spread: 1.0, mirror: 0, bottomPull: 0 },
};

/** Rotate an RGB color's hue by `degrees` (HSL round-trip). Pure. */
export function rotateHue(c: Rgb, degrees: number): Rgb {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { ...c };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  h = (((h + degrees) % 360) + 360) % 360;
  const hue2rgb = (p: number, q: number, t: number): number => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;
  return {
    r: Math.round(hue2rgb(p, q, hk + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hk) * 255),
    b: Math.round(hue2rgb(p, q, hk - 1 / 3) * 255),
  };
}

/**
 * Apply a preset palette to the theme-derived role colors: rotate the
 * hue, then mix toward the preset tint. Mix 0 + hue 0 is the identity
 * (the frost preset), so the hero's approved colors pass through
 * untouched. Pure.
 */
export function applyLightPreset(
  colors: Record<RibbonRole, Rgb>,
  preset: LightPreset,
): Record<RibbonRole, Rgb> {
  const out = {} as Record<RibbonRole, Rgb>;
  for (const role of ["deep", "bright", "pale", "accent"] as const) {
    out[role] = mix(rotateHue(colors[role], preset.hue), preset.tint, preset.tintMix);
  }
  return out;
}

/**
 * Field-mode transform of a band's y0 (fraction of viewport height):
 * spread around the center first, then pull toward (or away from) it.
 * Identity at centerPull 0 / spread 1. Clamped so a pushed band can
 * leave the viewport by a little (glassy edge) but never vanish far
 * outside it. Pure.
 */
export function modeBandY0(
  y0: number,
  centerPull: number,
  spread: number,
): number {
  const s = 0.5 + (y0 - 0.5) * spread;
  const p = s + (0.5 - s) * centerPull;
  return Math.min(1.15, Math.max(-0.15, p));
}

export const CHAPTER_PROFILES: Record<string, ChapterProfile> = {
  hero: { slope: 0, thick: 1, alpha: 1, speed: 1, pale: 1, deep: 1, bright: 1, preset: "frost", mode: "halo", ...LIGHT_PRESETS.frost, ...FIELD_MODES.halo },
  about: { slope: -0.04, thick: 0.9, alpha: 0.85, speed: 0.8, pale: 1.1, deep: 1, bright: 1, preset: "aurora", mode: "central", ...LIGHT_PRESETS.aurora, ...FIELD_MODES.central },
  publications: { slope: 0.05, thick: 1.1, alpha: 1, speed: 0.9, pale: 1.25, deep: 0.9, bright: 1.25, preset: "cobaltWave", mode: "diagonal", ...LIGHT_PRESETS.cobaltWave, ...FIELD_MODES.diagonal },
  experience: { slope: -0.03, thick: 1, alpha: 1, speed: 1, pale: 1, deep: 1.1, bright: 1, preset: "iceHalo", mode: "diagonal", ...LIGHT_PRESETS.iceHalo, ...FIELD_MODES.diagonal }, // fix5: alpha 0.9→1.0. fix6: mode edgeGlass→diagonal — edgeGlass empties the middle by design and the fix5 desktop critic measured the content zone the darkest in the set (mean 13.6) with light only in a top strip; diagonal carries bands across the middle, as publications proves at desktop. Pair stays unique (iceHalo/diagonal).
  projects: { slope: 0.06, thick: 1.15, alpha: 1.25, speed: 1.15, pale: 1, deep: 0.9, bright: 1.5, preset: "goldenHour", mode: "central", ...LIGHT_PRESETS.goldenHour, ...FIELD_MODES.central },
  skills: { slope: 0, thick: 0.85, alpha: 0.8, speed: 0.9, pale: 1, deep: 1, bright: 1, preset: "aurora", mode: "edgeGlass", ...LIGHT_PRESETS.aurora, ...FIELD_MODES.edgeGlass },
  contact: { slope: -0.05, thick: 0.9, alpha: 0.9, speed: 0.7, pale: 1.1, deep: 1, bright: 1, preset: "goldenHour", mode: "edgeGlass", ...LIGHT_PRESETS.goldenHour, ...FIELD_MODES.edgeGlass },
  epilogue: { slope: -0.05, thick: 0.9, alpha: 0.8, speed: 0.7, pale: 1.1, deep: 1, bright: 1, preset: "iceHalo", mode: "central", ...LIGHT_PRESETS.iceHalo, ...FIELD_MODES.central }, // fix5: alpha 0.65→0.8 — same lights-off read as experience at desktop; still below contact's 0.9, inside the test margin.
};

export function getChapterProfile(name: string | null): ChapterProfile {
  return CHAPTER_PROFILES[name ?? ""] ?? CHAPTER_PROFILES.hero;
}

export function lerpChapterProfile(
  a: ChapterProfile,
  b: ChapterProfile,
  k: number,
): ChapterProfile {
  const lerpTint = (channel: "r" | "g" | "b"): number =>
    a.tint[channel] + (b.tint[channel] - a.tint[channel]) * k;
  return {
    slope: a.slope + (b.slope - a.slope) * k,
    thick: a.thick + (b.thick - a.thick) * k,
    alpha: a.alpha + (b.alpha - a.alpha) * k,
    speed: a.speed + (b.speed - a.speed) * k,
    pale: a.pale + (b.pale - a.pale) * k,
    deep: a.deep + (b.deep - a.deep) * k,
    bright: a.bright + (b.bright - a.bright) * k,
    // Names are labels: they follow the target only at the exact
    // endpoint (k = 1), so lerp(a, b, 0) === a and lerp(a, b, 1) === b
    // stay exact — the probe hook reports the target's names on
    // chapter change, so the lerped names are never read live.
    preset: k >= 1 ? b.preset : a.preset,
    mode: k >= 1 ? b.mode : a.mode,
    hue: a.hue + (b.hue - a.hue) * k,
    tint: {
      r: lerpTint("r"),
      g: lerpTint("g"),
      b: lerpTint("b"),
    },
    tintMix: a.tintMix + (b.tintMix - a.tintMix) * k,
    centerPull: a.centerPull + (b.centerPull - a.centerPull) * k,
    fan: a.fan + (b.fan - a.fan) * k,
    spread: a.spread + (b.spread - a.spread) * k,
    mirror: a.mirror + (b.mirror - a.mirror) * k,
    bottomPull: a.bottomPull + (b.bottomPull - a.bottomPull) * k,
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

/**
 * Click-pulse core sprite (run-10 iter 31, RUN10-CLICK-PULSE): a hard
 * near-white disc with a sharp edge, drawn over the pulse head. The
 * mobile critic flagged the head as camouflaged among the ambient
 * soft orbs at 390px — same visual family, just brighter. The core
 * makes the head a different *kind* of object (a hot dot inside the
 * glow), so a single glance says "comet", not "another ambient orb".
 */
function makePulseCoreSprite(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 48;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  grad.addColorStop(0.0, rgba(WHITE, 1));
  grad.addColorStop(0.55, rgba(WHITE, 1));
  grad.addColorStop(0.8, rgba(WHITE, 0.45));
  grad.addColorStop(1.0, rgba(WHITE, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 48, 48);
  return c;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Dither seam (run-7 iter 10, RUN7-EXP-DITHER): the ribbon light
 * dissolves into background-colored dots across a band centered on
 * the hero's bottom edge. The level is SYMMETRIC — it rises to 1 at
 * the band center (the hero edge itself) and falls back to 0 — so
 * the light fades into dither at the edge and the next section's
 * light fades back in, with no hard edge on either side. (The first
 * version ramped 0 → 1 one-sidedly; the canvas profile proved the
 * light resumed below the band in a hard step — desktop 24 → 97.6,
 * mobile 24 → 197.8 within 8px — a stripe with a cliff, not a
 * dissolve; the symmetric ramp is the fix.) A pixel is a dot when
 * its blue-noise threshold is below the level — the site's 128x128
 * tile has a perfectly flat histogram (each value 0..255 occurs
 * exactly 64 times), so level 0.5 passes exactly half the tile and
 * the sweep is uniform, with isotropic grain instead of Bayer
 * cross-hatch.
 */
export const DITHER_SEAM_HEIGHT = 96;

export function dissolveLevelAt(y: number, top: number, height: number): number {
  const t = Math.min(1, Math.max(0, (y - top) / height));
  return smooth(0, 0.5, t) * (1 - smooth(0.5, 1, t));
}

export function ditherSeamPasses(x: number, y: number, level: number): boolean {
  return BLUE_NOISE_128[((y & 127) << 7) | (x & 127)] < level * 256;
}

/** Top y (viewport coords) to draw the seam strip at, or null when
 * the band is fully outside the viewport. The band is centered on
 * the hero's bottom edge, so at scroll 0 — hero is min-100dvh — it
 * reads as a dithered fringe at the fold. */
export function seamDrawY(
  heroBottom: number,
  viewportH: number,
  bandH: number = DITHER_SEAM_HEIGHT,
): number | null {
  const y = heroBottom - bandH / 2;
  if (y + bandH < 0 || y > viewportH) return null;
  return y;
}

/**
 * Scroll scrub (run-7 iter 14, RUN7-EXP-SCROLL-SCRUB): scroll position
 * scrubs the ribbon phase. A full-page scroll advances every band
 * 1.25 phase cycles — enough that scrolling visibly reconfigures the
 * light, small enough that the bands never jump. The offset is added
 * to the phase-travel terms only (drift and glide stay wall-clock
 * ambient motion); a 2π offset is exactly one phase-travel cycle for
 * every band, so the scrub is a pure phase advance that returns the
 * bands to their ambient positions after one full cycle.
 */
export const SCRUB_CYCLES = 1.25;
/** Exponential-chase rate for the scrub offset (per second) — ~250ms
 * time constant: fast enough to feel connected to the scroll, slow
 * enough to smooth Lenis jumps instead of snapping the light. */
export const SCRUB_CHASE_RATE = 4;

/** Scroll progress t in [0,1]: scrollY over the scrollable range. */
export function scrollProgress(scrollY: number, maxScroll: number): number {
  if (!(maxScroll > 0)) return 0;
  return Math.min(1, Math.max(0, scrollY / maxScroll));
}

/** Phase offset (radians) for a scroll progress: 1.25 cycles over the
 * full page. */
export function scrubPhaseOffset(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p * SCRUB_CYCLES * 2 * Math.PI;
}

/** Exponential chase (Talreja's UniverseClock): move `cur` toward
 * `target` by the frame-rate-independent factor 1 - exp(-rate * dt).
 * Never overshoots — the result always stays between cur and target. */
export function chaseValue(
  cur: number,
  target: number,
  rate: number,
  dtSeconds: number,
): number {
  if (!(rate > 0) || !(dtSeconds > 0)) return cur;
  return cur + (target - cur) * (1 - Math.exp(-rate * dtSeconds));
}

/**
 * Scroll velocity (run-7 iter 16, RUN7-EXP-SCROLL-VELOCITY): a
 * transient envelope in [0,1] driven by |scroll velocity|. Fast
 * attack (8/s — the light answers the fling within ~125ms) and slow
 * decay (1.2/s — it settles back to ambient over ~1s at rest), so a
 * scroll burst visibly quickens the ribbons without a snap. The
 * envelope multiplies the phase-travel rate (up to +6x, i.e. 7x
 * total) and the drift amplitude (up to +2x) — rate only, never
 * alpha or energy, so the legibility envelope is untouched. The
 * envelope is a pure function of the measured velocity, so it is
 * unit-testable; the draw loop below samples scrollY per frame.
 */
export const VELOCITY_FULL_SPEED = 1500; // px/s at which the envelope saturates
export const VELOCITY_ATTACK_RATE = 8; // per second — fast attack
export const VELOCITY_DECAY_RATE = 1.2; // per second — slow decay
export const VELOCITY_SPEED_BOOST = 6.0; // extra phase rate at full envelope
export const VELOCITY_DRIFT_BOOST = 2.0; // extra drift amplitude at full envelope

/** Envelope target for an absolute scroll velocity (px/s), in [0,1]. */
export function velocityEnvelopeTarget(absVelocityPxPerSec: number): number {
  if (!Number.isFinite(absVelocityPxPerSec) || absVelocityPxPerSec <= 0) {
    return 0;
  }
  return Math.min(1, absVelocityPxPerSec / VELOCITY_FULL_SPEED);
}

/** True scroll velocity (px/s) from two scroll samples and their
 * rAF timestamps — measured against WALL-CLOCK time, not the clamped
 * frame dt: on slow frames (headless swiftshader, low-end hardware)
 * the clamped dt (100ms) over-reads velocity up to 10x and pins the
 * envelope at 1 for any scroll, defeating the proportional design
 * (iter 16c: fast and slow scrolls both peaked at 0.8–0.85 envelope
 * under the clamped read). Returns null when the interval is not
 * positive (first frame, or a rewound clock). The phase advance
 * itself stays on the clamped dt — only the measurement uses wall
 * time, since velocity is a physical rate in px per real second. */
export function measureScrollVelocity(
  prevScrollY: number,
  scrollY: number,
  prevT: number,
  t: number,
): number | null {
  const dtMs = t - prevT;
  if (!(dtMs > 0)) return null;
  return Math.abs(scrollY - prevScrollY) / (dtMs / 1000);
}

/** Step the envelope toward its target: fast attack, slow decay. */
export function velocityEnvelopeStep(
  cur: number,
  target: number,
  dtSeconds: number,
): number {
  const rate = target > cur ? VELOCITY_ATTACK_RATE : VELOCITY_DECAY_RATE;
  return chaseValue(cur, target, rate, dtSeconds);
}

/**
 * Time-of-day light sets (run-7 iter 20, RUN7-EXP-DAYLIGHT): four sets
 * keyed to the visitor's LOCAL hour, after Bruno Simon's rebuilt
 * portfolio (rickcreates.com case-study writeup, read in full in
 * run-7 iter 18) — he defines a colour set per time of day (day peach
 * #FFD2C2 / purple shadows #6D3FFF, dusk coral #FF8181, dawn orange
 * #FFA882 / magenta #DB004F, night deep blue #3240FF 3x brighter with
 * lantern glow strongest) and fades gradually between phases over a
 * 4-minute day-night cycle. Ours keeps his STRUCTURE (a set per time
 * of day, gradual fade) but not his hues: the sets shift only
 * lightness/energy/role-mix inside the live cyan family + theme
 * tokens — day is brighter pale light at higher alpha, night is
 * deeper blues at dimmer ambient with a stronger flare contrast — so
 * the 2+1 discipline holds and no new hue enters. A set is a small
 * multiplier set over the base ribbon profile, the same shape as a
 * chapter profile's role mix, and it composes with chapters (daylight
 * x chapter) rather than replacing them.
 */
export type DaylightSetName = "morning" | "day" | "dusk" | "night";

export interface DaylightProfile {
  /** Overall ribbon alpha multiplier. */
  alpha: number;
  /** Pale-role alpha multiplier (the bright daylight wash). */
  pale: number;
  /** Deep-role alpha multiplier (the night blues). */
  deep: number;
  /** Bright-role alpha multiplier (the peak carrier band). */
  bright: number;
  /** Flare head/tail alpha multiplier (night contrast). */
  flare: number;
}

/** The identity set: the approved reference look, before any set applies. */
export const DAYLIGHT_IDENTITY: DaylightProfile = {
  alpha: 1,
  pale: 1,
  deep: 1,
  bright: 1,
  flare: 1,
};

export const DAYLIGHT_PROFILES: Record<DaylightSetName, DaylightProfile> = {
  // Set spacing (run-7 iter 20 in-iteration tuning): the first values
  // (day 1.15 / night 0.80, a 1.44x gap) FAILED a fresh critic — the
  // day/night difference was invisible at a glance. The diagnosis:
  // brightness breathing is ±16–20% per band, so day-min (1.15×0.80
  // = 0.92) and night-max (0.80×1.20 = 0.96) OVERLAP — any two frames
  // differ by breathing as much as by set, and the rendered luma only
  // moved ~10% (130.2 vs 118.7). The gap has to exceed the breathing
  // range: day 1.40 / night 0.70 is a 2.0x gap (day-min 1.12 vs
  // night-max 0.84 — separated), with the role mix widened the same
  // way (day pale 1.40, night deep 1.40). If a fresh critic still
  // cannot tell them apart at a glance, the effect is unfixable
  // inside the cyan-family/2+1 constraints and the build reverts.
  // Dawn/morning: soft fresh light — a gentle pale lift, everything
  // else near identity.
  morning: { alpha: 1.1, pale: 1.25, deep: 1.0, bright: 1.05, flare: 1.0 },
  // Midday: the brightest set — brighter pale ribbons, higher alpha,
  // the flare slightly tamed (it needs less help against bright sheets).
  day: { alpha: 1.4, pale: 1.4, deep: 0.9, bright: 1.1, flare: 0.85 },
  // Dusk: dimmer ambient, deeper blues starting to lead, flare
  // contrast rising as the sheets dim.
  dusk: { alpha: 0.85, pale: 0.9, deep: 1.3, bright: 1.15, flare: 1.3 },
  // Night: the dimmest ambient, deepest blues, strongest flare
  // contrast — the flare is the lantern glow in the dark.
  night: { alpha: 0.7, pale: 0.85, deep: 1.4, bright: 1.1, flare: 1.5 },
};

/** Chase rate for the set crossfade (per second): ~1.7s time constant,
 * settled in ~5s — gradual on mount and at hour boundaries, never a
 * snap, and fast enough that a verification pass can watch it land. */
export const DAYLIGHT_CHASE_RATE = 0.6;

/** The set for a local hour (0–23). Boundaries: morning 05–11, day
 * 11–17, dusk 17–20, night 20–05. A non-finite hour falls back to day
 * (the brightest, safest read); out-of-range hours wrap mod 24. */
export function daylightSetForHour(hour: number): DaylightSetName {
  if (!Number.isFinite(hour)) return "day";
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

export function lerpDaylightProfile(
  a: DaylightProfile,
  b: DaylightProfile,
  k: number,
): DaylightProfile {
  return {
    alpha: a.alpha + (b.alpha - a.alpha) * k,
    pale: a.pale + (b.pale - a.pale) * k,
    deep: a.deep + (b.deep - a.deep) * k,
    bright: a.bright + (b.bright - a.bright) * k,
    flare: a.flare + (b.flare - a.flare) * k,
  };
}

/**
 * Opening ring-of-light reveal (run-7 iter 22, RUN7-EXP-REVEAL).
 * Pure helpers, unit-tested below; the draw loop composes them.
 */
export const REVEAL_DURATION_MS = 2000;
/** Half-width of the wavefront transition: points within this of the
 * ring front are partially revealed. */
export const REVEAL_FEATHER_PX = 120;
/** Half-thickness of the drawn ring band (px). */
export const REVEAL_RING_THICKNESS_PX = 34;
/** Peak ring alpha (additive in dark mode) — soft, not a neon circle. */
export const REVEAL_RING_ALPHA = 0.6;

/** Eased ring-radius progress 0→1 over the reveal (ease-out cubic:
 * the wavefront moves fast early, then settles — the light arrives
 * quickly and the dissolve has time to read). Clamped. */
export function revealRadiusProgress(
  elapsedMs: number,
  durationMs: number = REVEAL_DURATION_MS,
): number {
  if (!(durationMs > 0)) return 1;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return 1 - Math.pow(1 - t, 3);
}

/** Ring alpha envelope 0→1→0 over the reveal: fades in over the first
 * 12% (the ring is born, not snapped), holds, fades out over the last
 * 25% (it dissolves as the light settles). 0 outside the window. */
export function revealRingAlpha(
  elapsedMs: number,
  durationMs: number = REVEAL_DURATION_MS,
): number {
  if (!(durationMs > 0) || elapsedMs <= 0 || elapsedMs >= durationMs)
    return 0;
  const t = elapsedMs / durationMs;
  return smooth(0, 0.12, t) * (1 - smooth(0.75, 1, t));
}

/** Reveal factor for one point: 1 well inside the ring front, 0 well
 * outside it, smooth across the feather band. The front sits at ringR;
 * the transition spans ringR ± feather. */
export function revealAt(
  x: number,
  y: number,
  cx: number,
  cy: number,
  ringR: number,
  feather: number = REVEAL_FEATHER_PX,
): number {
  const d = Math.hypot(x - cx, y - cy);
  const f = Math.max(1, feather);
  return 1 - smooth(0, 1, (d - (ringR - f)) / (2 * f));
}

/** Distance from the ring center to the farthest viewport corner —
 * the radius at which the wavefront has covered the whole canvas. */
export function revealMaxRadius(
  W: number,
  H: number,
  cx: number,
  cy: number,
): number {
  return Math.max(
    Math.hypot(cx, cy),
    Math.hypot(W - cx, cy),
    Math.hypot(cx, H - cy),
    Math.hypot(W - cx, H - cy),
  );
}

/** The boot overlay's DOM marker (components/effects/boot-sequence.tsx). */
export const BOOT_OVERLAY_SELECTOR = '[aria-label="System boot sequence"]';
/** Safety cap for the boot wait (ms): the overlay unmounts at 3.05s in
 * the normal path, so a wait past this means it never appeared. */
export const BOOT_WAIT_CAP_MS = 3500;

/** Whether a boot overlay is expected on this mount — the boot's own
 * shouldBoot conditions, minus reduced motion (handled by the caller):
 * fine pointer, wide viewport, and no `bercev-has-booted` flag. A null
 * flag (storage unavailable) falls back to expecting the boot, matching
 * the boot's own fallback (it mounts the overlay when storage fails).
 * Pure in its inputs so the gate is unit-testable. */
export function bootExpected(
  finePointer: boolean,
  viewportWidth: number,
  hasBootedFlag: boolean | null,
): boolean {
  if (!finePointer) return false;
  if (!(viewportWidth > 640)) return false;
  return hasBootedFlag !== true;
}

/**
 * Living ASCII glyph stream (run-7 iter 32, RUN7-EXP-GLYPH-STREAM v2):
 * the site's own GLYPHS vocab flows continuously along the bright
 * band's centerline at ~165px/s — the flare's speed, not the band's
 * ~4px/s drift — spaced 36px apart, drawn ONLY in the free page
 * margins (never over text, never over the rail), desktop only
 * (mobile has no margins by construction). v1 (run-7 iter 29) tied
 * the glyph alpha to the FLARE envelope: one phase showed glyphs at
 * ~2.5x over background (near-invisible) and another at ~11x, so the
 * stream read as intermittent, not flowing — two strict-motion FAILs
 * and a revert. v2's redesign is a BRIGHTNESS FLOOR: the glyph alpha
 * is floored at 0.6 and only gently coupled to the bright band's own
 * breathing (a ±20% swing, not the flare's 0→1 envelope), so ANY
 * phase shows margin glyphs at a glance. The margin-width problem
 * from iter 29 is answered the same way the floor is: dense 36px
 * spacing puts 2–3 glyphs in the ~96px right margin at 1440px at
 * once (a readable diagonal trio, not a lone speck), and 165px/s
 * means a 3s pair shows a wholly different constellation in the
 * margin (~495px of travel) — the pair test compares WHICH glyphs
 * are there, not a 12px nudge of the same ones. Reduced motion =
 * absent (a moving object has no static meaning — same as the flare).
 */
export const GLYPH_STREAM_SPEED_PX_S = 165;
export const GLYPH_STREAM_SPACING_PX = 36;
export const GLYPH_STREAM_SIZE_PX = 36;
/** Minimum glyph alpha, independent of band/flare phase. */
export const GLYPH_STREAM_FLOOR = 0.6;
/** Minimum usable margin width for the stream (px). */
export const GLYPH_STREAM_MIN_BAND_PX = 64;
/** Left-margin start: the rail guard's edge (energy() caps below 260). */
export const GLYPH_STREAM_RAIL_EDGE_PX = 260;

/** Glyph alpha from the bright band's normalized breathing in [0,1]:
 * floored at GLYPH_STREAM_FLOOR, rising to 1 at full brightness.
 * The swing is 0.6→1.0 — a gentle breathe, never a vanishing. */
export function glyphStreamAlpha(bandFactor: number): number {
  const f = Math.min(1, Math.max(0, bandFactor));
  return GLYPH_STREAM_FLOOR + (1 - GLYPH_STREAM_FLOOR) * f;
}

/** Normalize a band's instantaneous breathing value to [0,1]:
 * breath = 1 + bd*sin(...) ranges over [1-|bd|, 1+|bd|]. A band with
 * no breathing (bd = 0) sits at mid-brightness by definition. */
export function glyphStreamBandFactor(breath: number, bd: number): number {
  const a = Math.abs(bd);
  if (a < 1e-6) return 0.5;
  return Math.min(1, Math.max(0, (breath - (1 - a)) / (2 * a)));
}

/** The free-margin bands the stream may draw in, as [lo, hi] x-ranges:
 * left of the content column (starting past the rail) and right of it,
 * each inset 24px from the column and dropped when narrower than
 * GLYPH_STREAM_MIN_BAND_PX. At 1440px only the right margin qualifies
 * (~96px); at 1920px both do; on mobile neither does (the column spans
 * the viewport), so the stream is absent there by construction. */
export function glyphStreamMarginBands(
  width: number,
  colL: number,
  colR: number,
): Array<readonly [number, number]> {
  if (width < 700) return [];
  const bands: Array<readonly [number, number]> = [];
  const left: readonly [number, number] = [
    GLYPH_STREAM_RAIL_EDGE_PX,
    colL - 24,
  ];
  if (left[1] - left[0] >= GLYPH_STREAM_MIN_BAND_PX) bands.push(left);
  const right: readonly [number, number] = [colR + 24, width - 24];
  if (right[1] - right[0] >= GLYPH_STREAM_MIN_BAND_PX) bands.push(right);
  return bands;
}

/** A stream glyph's x at time tSeconds: glyphs march +x at the stream
 * speed, wrapping over [spanMin, spanMax] so the flow is continuous —
 * a glyph that leaves the right edge re-enters at the left. `index`
 * is the glyph's slot in the stream; spacing sets the along-band gap. */
export function glyphStreamX(
  index: number,
  tSeconds: number,
  spacing: number,
  speed: number,
  spanMin: number,
  spanMax: number,
): number {
  const span = spanMax - spanMin;
  if (span <= 0) return spanMin;
  const raw = index * spacing + speed * tSeconds;
  const wrapped = ((raw - spanMin) % span + span) % span;
  return spanMin + wrapped;
}

/**
 * A band's centerline height at x, pure in its inputs so the scrub
 * math is unit-testable. `ct` is the chapter clock (ms); `scrubPhase`
 * is the scroll-derived phase offset in radians, added to the two
 * phase-travel terms in their own sign direction so both wobbles
 * advance with the scroll. Drift and glide stay wall-clock: they are
 * slow ambient motion, not phase. `driftScale` (run-7 iter 16,
 * RUN7-EXP-SCROLL-VELOCITY) scales the lateral drift amplitude while
 * the page is scrolling — 1 at rest, up to 3 at full scroll
 * velocity — so the bands swing wider mid-fling and settle back.
 */
export function ribbonCenterY(
  r: RibbonDef,
  x: number,
  ct: number,
  chapterSlope: number,
  H: number,
  scrubPhase = 0,
  driftScale = 1,
  mode: FieldMode = { centerPull: 0, fan: 1, spread: 1, mirror: 0, bottomPull: 0 },
  // Set ONLY for the profile's lowest band (the caller knows which
  // band that is): the mirror folds that band across the center when
  // the mode's transform still leaves it above it, so Halo/Edge Glass
  // put light below the center too. Gated per-band — mirroring every
  // band would flip the whole field to the bottom.
  mirrorLow = false,
): number {
  const ph = r.drift * driftScale * Math.sin((ct * 6.2832) / r.dp);
  // Field mode (RUN10-PRESETS): the mode gathers/spreads the band's
  // base y0 and fans its slope — the chapter's geometry, lerped by the
  // chapter crossfade. Defaults are the identity (old behavior).
  let y0 = modeBandY0(r.y0, mode.centerPull, mode.spread);
  if (mirrorLow && mode.mirror > 0 && y0 < 0.5) {
    // Fold toward the mirror position, weighted by the lerped mirror
    // weight: at weight 1 the band sits at 1 - y0, at weight 0 it
    // stays put, and a crossfade sweeps it across the center instead
    // of snapping. No-op when the band is already below center (the
    // narrow profile's low band is there on its own).
    y0 = y0 + (1 - 2 * y0) * mode.mirror;
  }
  if (mirrorLow && mode.bottomPull > 0 && mode.mirror > 0) {
    // Edge-glass bottom pull (fix3): after the center mirror, pull
    // the folded band toward the bottom anchor (0.85H) — the frame's
    // bottom band must REST in the bottom third, and a center mirror
    // leaves the narrow profile's low band (already below center at
    // ~0.71H, so the mirror above never fires) sitting there with
    // only its faint tail in the bottom third: two critics measured
    // the DOM bottom third black while the canvas claimed light, and
    // no alpha multiplier can fix where the light sits. bottomPull
    // is a lerped number, so a halo→edgeGlass crossfade sweeps the
    // band down smoothly instead of snapping its target at k = 1
    // (a mode-name branch would snap — names follow "from" until
    // the exact endpoint). Gated on mirror so modes without a fold
    // never pull.
    y0 = y0 + (0.85 - y0) * mode.bottomPull * mode.mirror;
  }
  const slope = r.slope * mode.fan;
  return (
    y0 * H +
    (slope + chapterSlope) * x +
    r.ga * Math.sin((ct * 6.2832) / r.gp + r.gph) +
    r.a1 * Math.sin((x + ph) * r.f1 + (ct * 6.2832) / r.p1 + scrubPhase) +
    r.a2 *
      Math.sin((x - ph * 0.6) * r.f2 - ((ct * 6.2832) / r.p2 + scrubPhase))
  );
}

export function LightRibbons() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Record<RibbonRole, HTMLCanvasElement> | null>(
    null,
  );
  const flareSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const pulseCoreSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const bgRef = useRef<Rgb>({ r: 5, g: 7, b: 12 });
  const accentRef = useRef<Rgb>({ r: 125, g: 211, b: 252 });
  const glowRef = useRef<Rgb>({ r: 186, g: 230, b: 253 });
  // Preset sprites (RUN10-PRESETS): the chapter's preset tints the
  // theme-derived role colors, so the sprites are rebuilt from the
  // probed tokens + the current (lerped) preset whenever the quantized
  // preset key changes — a few tiny 2x128 canvases per tween, never
  // per frame. Null until the first draw builds them.
  const presetSpritesRef = useRef<Record<RibbonRole, HTMLCanvasElement> | null>(
    null,
  );
  const presetFlareRef = useRef<HTMLCanvasElement | null>(null);
  const presetAccentRef = useRef<Rgb | null>(null);
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
    glowRef.current = glow;
    const colors = resolveRibbonColors(accent, glow);
    spritesRef.current = {
      deep: makeSprite(colors.deep),
      bright: makeSprite(colors.bright),
      pale: makeSprite(colors.pale),
      accent: makeSprite(colors.accent),
    };
    flareSpriteRef.current = makeFlareSprite(colors.bright, colors.accent);
    pulseCoreSpriteRef.current = makePulseCoreSprite();
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

    // Dither seam (RUN7-EXP-DITHER): the pre-rendered dissolve strip,
    // rebuilt whenever the viewport width or probed background changes
    // (the key check in draw() makes the rebuild lazy — one ImageData
    // pass per theme/resize change, one drawImage per frame).
    let seamStrip: HTMLCanvasElement | null = null;
    let seamStripKey = "";
    // Hero bottom edge in viewport coords, cached alongside the
    // chapter rects (updateChapter re-reads only on scroll/height
    // change, so this never forces a layout per frame).
    let heroBottom = Number.NEGATIVE_INFINITY;

    /** Build (or reuse) the seam strip for the current width + bg. */
    const buildSeamStrip = (): HTMLCanvasElement => {
      const bg = bgRef.current;
      const key = `${W}x${bg.r},${bg.g},${bg.b}`;
      if (seamStrip && seamStripKey === key) return seamStrip;
      const strip = document.createElement("canvas");
      strip.width = Math.max(2, W);
      strip.height = DITHER_SEAM_HEIGHT;
      const g = strip.getContext("2d");
      if (g) {
        const img = g.createImageData(strip.width, strip.height);
        for (let y = 0; y < strip.height; y++) {
          const cut = dissolveLevelAt(y, 0, strip.height) * 256;
          for (let x = 0; x < strip.width; x++) {
            if (BLUE_NOISE_128[((y & 127) << 7) | (x & 127)] < cut) {
              const i = (y * strip.width + x) * 4;
              img.data[i] = bg.r;
              img.data[i + 1] = bg.g;
              img.data[i + 2] = bg.b;
              img.data[i + 3] = 255;
            }
          }
        }
        g.putImageData(img, 0, 0);
      }
      seamStrip = strip;
      seamStripKey = key;
      return strip;
    };

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
    // Scroll scrub (RUN7-EXP-SCROLL-SCRUB): the scroll-derived phase
    // offset, chased toward its target each frame so the light follows
    // the scroll smoothly instead of snapping. Reduced motion never
    // sets the target, so scrubCur stays 0 there by construction.
    let scrubCur = 0;
    let scrubTarget = 0;
    let lastScrubProbe = "";
    // Preset sprite key (RUN10-PRESETS): the quantized lerped preset
    // (hue to 1°, tint channels, tintMix to 0.02) — the draw loop
    // rebuilds the preset sprites only when this changes, so a 600ms
    // chapter crossfade rebuilds a few tiny sprites instead of one
    // per frame, and a settled chapter rebuilds none.
    let lastPresetKey = "";
    // Scroll velocity (RUN7-EXP-SCROLL-VELOCITY): the transient
    // envelope in [0,1] — 0 at rest, surging toward 1 while the page
    // moves. Sampled per frame from scrollY; reduced motion never
    // samples it (no rAF loop), so it stays 0 there by construction.
    let velEnv = 0;
    let lastVelScrollY = -1;
    let lastVelT = -1;
    let lastVelProbe = "";

    // Click pulse (run-10 iter 31, RUN10-CLICK-PULSE): live pulses
    // spawned by pointerdown, drawn in draw() after the flare.
    const pulses: ClickPulse[] = [];
    let lastPulseProbe = "";

    // Daylight (RUN7-EXP-DAYLIGHT): the time-of-day set currently
    // rendered, chased toward the set for the visitor's local hour.
    // Starts at identity so the mount crossfades in gradually; the
    // target is re-resolved every frame, so an hour boundary
    // crossfades instead of snapping. Reduced motion snaps (no loop
    // to chase in — the static repaint takes the target directly).
    let daylightCur: DaylightProfile = { ...DAYLIGHT_IDENTITY };
    let daylightTarget: DaylightProfile = { ...DAYLIGHT_IDENTITY };
    let daylightSetName: DaylightSetName | null = null;
    let lastDaylightProbe = "";

    // Opening reveal (RUN7-EXP-REVEAL): the rAF timestamp of the
    // first animated frame — the reveal clock starts there, so the
    // 2s window is wall-clock time, not frame count (slow headless
    // rAF still blooms on schedule). -1 until the first frame.
    let revealStartT = -1;
    let lastRevealProbe = "";

    // Opening reveal vs the boot overlay (RUN7-EXP-REVEAL, see the
    // header note): when a boot is expected, the reveal clock does
    // not start until the overlay has been seen in the DOM and then
    // left it, or the safety cap elapses. The gate itself lives in
    // draw(), next to the reveal clock; these are its inputs.
    const bootExpectedNow = bootExpected(
      window.matchMedia("(pointer: fine)").matches,
      window.innerWidth,
      (() => {
        try {
          return window.localStorage.getItem("bercev-has-booted") === "1";
        } catch {
          return null;
        }
      })(),
    );
    let bootSeen = false;
    let bootCleared = !bootExpectedNow;
    const bootWaitStart = performance.now();

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
      // Dither seam anchor: the hero's bottom edge rides the scroll,
      // so the seam travels with the hero/about boundary.
      const heroEl = document.querySelector('[data-light-chapter="home"]');
      heroBottom = heroEl
        ? heroEl.getBoundingClientRect().bottom
        : Number.NEGATIVE_INFINITY;
      // Scroll scrub target: pure function of scroll progress, so
      // scrolling back rewinds the light exactly. updateChapter only
      // runs on scroll/height change, which is exactly when the
      // target can move; the chase itself runs every frame in draw().
      if (!reduced) {
        const maxScroll = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        scrubTarget = scrubPhaseOffset(
          scrollProgress(window.scrollY, maxScroll),
        );
      }
      if (!active || active === chapterActive) return;
      chapterActive = active;
      chapterFrom = { ...chapterCur };
      chapterTarget = getChapterProfile(active);
      chapterTweenStart = now;
      // Probe hook for verification (and for any future chapter-aware
      // chrome): the canvas always names its active chapter, preset,
      // and field mode. Fix4 (RUN10-PRESETS): the preset ALSO reaches
      // the DOM — `data-light-preset` on <html> lets the active
      // chapter's own light surfaces (the contact wave, glow dots,
      // light rules, submit glow) take the preset palette, because the
      // canvas gold is occluded by the form panel at contact and never
      // reads in the DOM frame (both critics, fix3). The canvas lerps
      // its colors over the same 600ms; the DOM surfaces crossfade
      // with it (CSS transitions / the wave's own tween).
      canvas.dataset.activeChapter = active;
      canvas.dataset.preset = chapterTarget.preset;
      canvas.dataset.fieldMode = chapterTarget.mode;
      root.dataset.lightPreset = chapterTarget.preset;
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

    const centerY = (
      r: RibbonDef,
      x: number,
      ct: number,
      // Set ONLY for the profile's lowest band (the band loop knows
      // which band that is) — see ribbonCenterY's mirrorLow.
      mirrorLow = false,
    ): number =>
      ribbonCenterY(
        r,
        x,
        ct,
        chapterCur.slope,
        H,
        scrubCur,
        1 + velEnv * VELOCITY_DRIFT_BOOST,
        // Field mode (RUN10-PRESETS): the chapter's geometry — the
        // bands gather/spread/fan as the chapter crossfades.
        {
          centerPull: chapterCur.centerPull,
          fan: chapterCur.fan,
          spread: chapterCur.spread,
          mirror: chapterCur.mirror,
          bottomPull: chapterCur.bottomPull,
        },
        mirrorLow,
      );

    const thick = (r: RibbonDef, x: number, ct: number): number =>
      r.th *
      chapterCur.thick *
      (0.78 +
        0.22 *
          Math.sin(
            x * 0.0021 + (ct * 6.2832) / (W < 700 ? 6900 : 9375),
          ));

    const draw = (t: number) => {
      // Base sprites are the guard: preset sprites build lazily from
      // them in the preset block below, so the first frame has a set
      // to fall back to.
      if (!spritesRef.current) return;
      // Chapter clock: advance the ribbon phase at the current
      // chapter's speed, and crossfade toward the active chapter's
      // profile. dt is clamped so a hidden-tab gap never jumps the
      // phase (the loop also pauses on visibilitychange).
      const dt = lastT > 0 ? Math.min(100, Math.max(0, t - lastT)) : 0;
      lastT = t;
      updateChapter(t);
      stepChapter(t);
      // Opening ring-of-light reveal (RUN7-EXP-REVEAL): on first
      // mount the light blooms outward from the hero center behind
      // an expanding ring (~2s), then the ring dissolves and the
      // reveal is done for the life of this mount. The ribbon slices,
      // top glow, seam and flare all read the same reveal state
      // below, so the whole light layer blooms as one. The center is
      // the hero's center (its bottom edge rides the scroll via
      // updateChapter, clamped into the viewport for a mid-scroll
      // remount). Reduced motion never enters this block: the static
      // frame is the fully revealed look, and dataset.reveal reads
      // "done" from the start. A hidden-tab gap jumps the clock past
      // the window, so the reveal simply completes while hidden —
      // correct behavior, no visible jump.
      let revealDone = reduced;
      let revealGlobal = reduced ? 1 : 0;
      let revealCx = W / 2;
      let revealCy = H / 2;
      let revealRingR = 0;
      let revealRingA = 0;
      const revealFactorAt = (x: number, y: number): number =>
        revealDone ? 1 : revealAt(x, y, revealCx, revealCy, revealRingR);
      if (!reduced) {
        // Boot gate (see the setup comment): hold the reveal until
        // the boot overlay has been seen and left, or the cap elapses.
        // While held, revealGlobal stays 0 — the canvas shows the bare
        // background behind the opaque overlay, and the light blooms
        // only once the hero is actually visible.
        if (!bootCleared) {
          if (document.querySelector(BOOT_OVERLAY_SELECTOR)) {
            bootSeen = true;
          } else if (
            bootSeen ||
            performance.now() - bootWaitStart > BOOT_WAIT_CAP_MS
          ) {
            bootCleared = true;
          }
        }
        if (bootCleared) {
          if (revealStartT < 0) revealStartT = t;
          const elapsed = t - revealStartT;
          const progress = revealRadiusProgress(elapsed);
          revealGlobal = progress;
          if (elapsed < REVEAL_DURATION_MS) {
            const hb = Number.isFinite(heroBottom) ? heroBottom : H;
            revealCy = Math.min(Math.max(hb / 2, 0), H);
            revealRingR =
              progress * revealMaxRadius(W, H, revealCx, revealCy);
            revealRingA = REVEAL_RING_ALPHA * revealRingAlpha(elapsed);
          } else {
            revealDone = true;
          }
          const probe = revealDone ? "done" : progress.toFixed(2);
          if (probe !== lastRevealProbe) {
            lastRevealProbe = probe;
            canvas.dataset.reveal = probe;
          }
        }
      } else if (lastRevealProbe !== "done") {
        lastRevealProbe = "done";
        canvas.dataset.reveal = "done";
      }
      // Daylight (RUN7-EXP-DAYLIGHT): resolve the set from the
      // visitor's local hour every frame and chase toward it — the
      // mount crossfades in from identity and an hour boundary
      // crossfades instead of snapping. Reduced motion snaps to the
      // target (the static repaint has no loop to chase in). The
      // probe hook reports the set name + the lerped alpha for
      // verification (a mocked hour in tests reads here).
      const setName = daylightSetForHour(new Date().getHours());
      if (setName !== daylightSetName) {
        daylightSetName = setName;
        daylightTarget = DAYLIGHT_PROFILES[setName];
        canvas.dataset.daylightSet = setName;
      }
      if (reduced) {
        daylightCur = { ...daylightTarget };
      } else {
        daylightCur = lerpDaylightProfile(
          daylightCur,
          daylightTarget,
          1 - Math.exp(-DAYLIGHT_CHASE_RATE * (dt / 1000)),
        );
      }
      const dlProbe = daylightCur.alpha.toFixed(2);
      if (dlProbe !== lastDaylightProbe) {
        lastDaylightProbe = dlProbe;
        canvas.dataset.daylightAlpha = dlProbe;
      }
      // Scroll velocity (RUN7-EXP-SCROLL-VELOCITY): sample the scroll
      // position every frame and step the envelope toward the target
      // for the measured velocity — fast attack while scrolling, slow
      // decay at rest. The velocity is measured against WALL-CLOCK
      // frame time (measureScrollVelocity): the clamped dt below
      // (100ms) over-reads velocity up to 10x on slow frames and
      // would pin the envelope at 1 for any scroll. The envelope
      // chase uses the same wall-clock interval, so attack/decay run
      // at their designed per-real-second rates; the PHASE advance
      // below stays on the clamped dt so a hidden-tab gap never
      // jumps the phase. The envelope multiplies the phase rate
      // (up to 3x) and the drift amplitude in centerY (up to 1.5x)
      // — rate only, never alpha or energy.
      if (!reduced) {
        const sy = window.scrollY;
        if (lastVelScrollY >= 0) {
          const v = measureScrollVelocity(lastVelScrollY, sy, lastVelT, t);
          if (v !== null) {
            const velDt = Math.min(1000, Math.max(0, t - lastVelT)) / 1000;
            velEnv = velocityEnvelopeStep(
              velEnv,
              velocityEnvelopeTarget(v),
              velDt,
            );
          }
        }
        lastVelScrollY = sy;
        lastVelT = t;
        const vProbe = velEnv.toFixed(2);
        if (vProbe !== lastVelProbe) {
          lastVelProbe = vProbe;
          canvas.dataset.scrollVelocity = vProbe;
        }
      }
      tChapter +=
        dt * chapterCur.speed * (1 + velEnv * VELOCITY_SPEED_BOOST);
      // Scroll scrub (RUN7-EXP-SCROLL-SCRUB): chase the scroll-derived
      // phase offset toward its target with the same clamped dt, so
      // the light follows the scroll at a frame-rate-independent rate
      // and rewinds exactly on scroll-up. The probe hook reports the
      // live offset (rounded, only on change) for verification.
      if (!reduced) {
        scrubCur = chaseValue(scrubCur, scrubTarget, SCRUB_CHASE_RATE, dt / 1000);
        const probe = scrubCur.toFixed(2);
        if (probe !== lastScrubProbe) {
          lastScrubProbe = probe;
          canvas.dataset.scrubPhase = probe;
        }
      }
      const bg = bgRef.current;
      // Preset palette (RUN10-PRESETS): the chapter's preset tints the
      // probed role colors; the lerped hue/tintMix crossfade with the
      // chapter tween, and the sprites rebuild only when the quantized
      // key moves. The top glow, glyph stream, and reveal ring below
      // all read this same `accent`, so the whole light layer shifts
      // palette as one. The flare sprite is rebuilt with the same key
      // (its block reads presetFlareRef with a base fallback).
      let accent = accentRef.current;
      const presetKey = [
        Math.round(chapterCur.hue),
        Math.round(chapterCur.tint.r),
        Math.round(chapterCur.tint.g),
        Math.round(chapterCur.tint.b),
        chapterCur.tintMix.toFixed(2),
      ].join("|");
      if (presetKey !== lastPresetKey) {
        lastPresetKey = presetKey;
        const presetColors = applyLightPreset(
          resolveRibbonColors(accentRef.current, glowRef.current),
          {
            hue: chapterCur.hue,
            tint: chapterCur.tint,
            tintMix: chapterCur.tintMix,
          },
        );
        presetSpritesRef.current = {
          deep: makeSprite(presetColors.deep),
          bright: makeSprite(presetColors.bright),
          pale: makeSprite(presetColors.pale),
          accent: makeSprite(presetColors.accent),
        };
        presetFlareRef.current = makeFlareSprite(
          presetColors.bright,
          presetColors.accent,
        );
        presetAccentRef.current = presetColors.accent;
        canvas.dataset.presetHue = String(Math.round(chapterCur.hue));
      }
      if (presetSpritesRef.current) {
        accent = presetAccentRef.current ?? accent;
      }
      // The band loop reads the preset set (or the base set before the
      // first rebuild) — sprites and accent update in the same frame.
      const sprites = presetSpritesRef.current ?? spritesRef.current;
      if (!sprites) return;
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
      // A whisper of top glow, in the live accent — gated by the
      // reveal so the whole light layer blooms as one (0 before the
      // ring starts, full once it has dissolved).
      const top = ctx.createLinearGradient(0, 0, 0, H * 0.5);
      top.addColorStop(0, rgba(accent, (dark ? 0.12 : 0.06) * revealGlobal));
      top.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, W, H * 0.5);

      // Ribbons on the half-res offscreen, additive in dark mode.
      // Narrow screens use the faster, wider-travel profile (+ low band);
      // desktop uses the boosted profile (in-iteration tuning, iter 2).
      const list = W < 700 ? NARROW_RIBBONS : DESKTOP_RIBBONS;
      // The lowest band's base y0 — only that band ever mirrors (the
      // Halo/Edge Glass fold, see ribbonCenterY's mirrorLow).
      const lowestY0 = Math.max(...list.map((b) => b.y0));
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
        // Daylight (RUN7-EXP-DAYLIGHT): the set shifts the pale/deep/
        // bright balance inside the live cyan family, the same shape
        // as the chapter role mix — it composes (daylight x chapter),
        // never a new hue.
        const daylightRoleScale =
          r.role === "bright"
            ? daylightCur.bright
            : r.role === "pale"
              ? daylightCur.pale
              : r.role === "deep"
                ? daylightCur.deep
                : 1;
        // Edge-glass edge boost (run-10 iter 35 fix2): the frame's
        // bands live on the viewport's edges, and both edges are
        // disadvantaged in the RENDERED frame — the top bands only
        // show their gradient tails (centers above the viewport) and
        // the folded lowest band sits behind the content, so the
        // canvas probe overstates them (both critics, fix1: the
        // bottom light measured 25–35 on the canvas but read black in
        // the DOM frame). In edgeGlass mode only, the tail bands get
        // 1.6x and the folded band 2.2x, so the frame reads at a
        // glance. Fix3: the folded band is the lowest band whenever
        // the mirror is on — in edgeGlass it always folds (center
        // mirror above the center, bottom pull to the 0.85H anchor
        // below it), so the y0t < 0.5 gate is gone. Halo's ring is
        // already visible without a boost, so it stays unboosted
        // (the hero's approved look).
        let edgeBoost = 1;
        if (chapterCur.mode === "edgeGlass") {
          const y0t = modeBandY0(
            r.y0,
            chapterCur.centerPull,
            chapterCur.spread,
          );
          if (y0t < 0) edgeBoost = 1.6;
          else if (r.y0 === lowestY0 && chapterCur.mirror > 0)
            edgeBoost = 2.2;
        }
        const ba =
          r.alpha *
          alphaScale *
          chapterCur.alpha *
          daylightCur.alpha *
          roleScale *
          daylightRoleScale *
          edgeBoost *
          (1 + r.bd * Math.sin((tChapter * 6.2832) / r.bp + r.bph));
        for (let ox = 0; ox < off.width; ox += step) {
          const xCss = (ox + step / 2) / S;
          const cCss = centerY(r, xCss, tChapter, r.y0 === lowestY0);
          // Opening reveal (RUN7-EXP-REVEAL): each slice fades in
          // as the ring front passes it — the light blooms outward
          // from the hero center instead of snapping on. Identity
          // (factor 1) once the reveal is done.
          const a = ba * energy(xCss, cCss) * revealFactorAt(xCss, cCss);
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

      // Opening ring-of-light reveal (RUN7-EXP-REVEAL): the wavefront
      // itself — a soft radial ring drawn with a per-frame gradient
      // (constant px thickness at every radius, unlike a scaled
      // sprite whose annulus would thin to nothing at small radii).
      // Drawn AFTER the blur pass but BEFORE the halo on purpose:
      // the column halo softens the ring over the text column (it
      // never washes BERAT or the rail labels) while the margins and
      // edges carry the full ring. Bright core + accent falloff, same
      // family as the flare head; additive in dark mode.
      if (!revealDone && revealRingA > 0.004) {
        const bright = mix(accent, WHITE, 0.28);
        const core = mix(bright, WHITE, 0.45);
        const r0 = Math.max(0, revealRingR - REVEAL_RING_THICKNESS_PX);
        const r1 = revealRingR + REVEAL_RING_THICKNESS_PX;
        const ring = ctx.createRadialGradient(
          revealCx, revealCy, r0, revealCx, revealCy, r1,
        );
        ring.addColorStop(0, rgba(bright, 0));
        ring.addColorStop(0.35, rgba(bright, 0.6 * revealRingA));
        ring.addColorStop(0.5, rgba(core, 0.9 * revealRingA));
        ring.addColorStop(0.65, rgba(accent, 0.45 * revealRingA));
        ring.addColorStop(1, rgba(accent, 0));
        ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = ring;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
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

      // Dither seam (run-7 iter 10, RUN7-EXP-DITHER): the blue-noise
      // dissolve anchored to the hero's bottom edge — the ribbon light
      // halftones out toward the edge and the next section's light
      // fades back in across the 96px band, so the page crosses from
      // hero into about through a printed dissolve instead of a hard
      // light cut. The strip is pre-rendered (per width + probed
      // background) and drawn as one image per frame; it rides the
      // hero edge as you scroll, so at scroll 0 it reads as a
      // dithered fringe at the fold. Drawn AFTER the halo (so the
      // halo's column wash dissolves too) and BEFORE the flare (the
      // head stays bright over the seam). The dots are the probed
      // background color and sit behind the DOM — they can only dim
      // the light behind text, never cover it. Under reduced motion
      // the static frame includes the seam at the current scroll
      // position (the repaint on scroll repositions it).
      const sy = seamDrawY(heroBottom, H);
      if (sy !== null) {
        ctx.globalCompositeOperation = "source-over";
        // Opening reveal (RUN7-EXP-REVEAL): the seam fades in with
        // the reveal so no pre-revealed light shows at the fold.
        ctx.globalAlpha = revealGlobal;
        ctx.drawImage(buildSeamStrip(), 0, sy);
        ctx.globalAlpha = 1;
      }

      // Living ASCII glyph stream (run-7 iter 32, RUN7-EXP-GLYPH-STREAM
      // v2): the site's GLYPHS vocab flows along the bright band's
      // centerline at ~165px/s, drawn ONLY where a free margin band
      // is wide enough — never over the content column, never over
      // the rail. Drawn AFTER the seam and BEFORE the flare, so the
      // flare head stays the brightest object. Glyphs are sharp (no
      // blur pass) in the live accent mixed toward white; their alpha
      // is floored (glyphStreamAlpha) so they never vanish with the
      // band's breathing or the flare's envelope — the v1 failure.
      // The reveal factor still applies, so the stream blooms in
      // with the rest of the light. Under reduced motion the stream
      // is ABSENT (no rAF loop draws it); on mobile the margin bands
      // are empty, so it is absent there by construction. The probe
      // hook reports how many glyphs were drawn this frame.
      // RUN9-BUST-TRAVEL: the stream yields to the portrait — a glyph
      // whose center falls inside the bust's live box (plus
      // clearance) is skipped while the bust is bright, so no "018"
      // triple ever marches over the dome again. When the bust is
      // parked its published opacity is 0 and the gate lifts: the
      // margin belongs to the stream between chapters, to the bust
      // at hero and contact.
      if (!reduced) {
        const host = list.find((b) => b.role === "bright") ?? list[0];
        const bands = glyphStreamMarginBands(W, colL, colR);
        const bustBox = getBustTravelBox();
        if (host && bands.length > 0) {
          const breath =
            1 + host.bd * Math.sin((tChapter * 6.2832) / host.bp + host.bph);
          const baseA = glyphStreamAlpha(
            glyphStreamBandFactor(breath, host.bd),
          );
          const glyphFill = mix(accent, WHITE, 0.6);
          const spanMin = -100;
          const spanMax = W + 100;
          const count = Math.max(
            1,
            Math.ceil((spanMax - spanMin) / GLYPH_STREAM_SPACING_PX),
          );
          ctx.font = `600 ${GLYPH_STREAM_SIZE_PX}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
          let drawn = 0;
          const tSeconds = t / 1000;
          for (let i = 0; i < count; i++) {
            const gx = glyphStreamX(
              i,
              tSeconds,
              GLYPH_STREAM_SPACING_PX,
              GLYPH_STREAM_SPEED_PX_S,
              spanMin,
              spanMax,
            );
            let inBand = false;
            for (let b = 0; b < bands.length; b++) {
              if (gx >= bands[b][0] && gx <= bands[b][1]) {
                inBand = true;
                break;
              }
            }
            if (!inBand) continue;
            const gy = centerY(host, gx, tChapter);
            if (streamGlyphHiddenByBust(gx, gy, bustBox)) continue;
            const a =
              baseA * energy(gx, gy) * revealFactorAt(gx, gy);
            if (a < 0.004) continue;
            ctx.globalAlpha = Math.min(1, a);
            ctx.fillStyle = rgba(glyphFill, 1);
            ctx.fillText(GLYPHS[i % GLYPHS.length], gx, gy);
            drawn++;
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
          const probe = String(drawn);
          if (canvas.dataset.glyphStream !== probe) {
            canvas.dataset.glyphStream = probe;
          }
        } else if (canvas.dataset.glyphStream !== "0") {
          canvas.dataset.glyphStream = "0";
        }
      } else if (canvas.dataset.glyphStream !== "0") {
        canvas.dataset.glyphStream = "0";
      }

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
        // Preset-tinted flare (RUN10-PRESETS) with the base sprite as
        // the fallback before the first preset rebuild.
        const flareSprite =
          presetFlareRef.current ?? flareSpriteRef.current;
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
              const a =
                env * 0.5 * (1 - k / 6) * energy(tx, ty) * daylightCur.flare *
                // Opening reveal (RUN7-EXP-REVEAL): the tail only
                // shows where the light has been revealed.
                revealFactorAt(tx, ty);
              if (a < 0.004) continue;
              const d = headR * (1 - k / 8) * 2;
              ctx.globalAlpha = Math.min(1, a);
              ctx.drawImage(flareSprite, tx - d / 2, ty - d / 2, d, d);
            }
            // Daylight (RUN7-EXP-DAYLIGHT): the flare is the night
            // set's lantern glow — its contrast rises as the sheets
            // dim, and is slightly tamed at midday.
            const ha =
              env * 1.0 * energy(headX, headY) * daylightCur.flare *
              // Opening reveal (RUN7-EXP-REVEAL): the head only shows
              // where the light has been revealed.
              revealFactorAt(headX, headY);
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

      // Click pulse (run-10 iter 31, RUN10-CLICK-PULSE): the head +
      // tail a pointer click sent traveling along the bright band's
      // slope. Drawn AFTER the flare so it is the brightest object
      // on the canvas, sharp on the main canvas (never through the
      // blur pass), additive in dark mode — the same treatment as
      // the flare head, with energy() + the reveal factor applied
      // exactly as for the flare. Expired pulses are pruned here so
      // the probe below reads the live set. Under reduced motion
      // there is no listener and no pulse — the static frame is
      // untouched.
      if (!reduced) {
        const pulseSprite = flareSpriteRef.current;
        if (pulseSprite) {
          for (let i = pulses.length - 1; i >= 0; i--) {
            if (!clickPulseActive(t - pulses[i].startT)) {
              pulses.splice(i, 1);
            }
          }
          if (pulses.length > 0) {
            ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
            for (const p of pulses) {
              const age = t - p.startT;
              // Tail first: fading ghosts behind the head along the
              // band slope (the tail grows as the head travels — see
              // lib/click-pulse.ts). Energy is floored (same file):
              // the pulse must read on its own in dark gaps, where
              // raw energy() falls to ~0.25.
              for (let k = CLICK_PULSE_TAIL_COUNT; k >= 1; k--) {
                const g = clickPulseTail(p, age, k);
                if (g.alpha < 0.004) continue;
                const ga =
                  g.alpha *
                  clickPulseEnergyAt(energy(g.x, g.y)) *
                  revealFactorAt(g.x, g.y);
                if (ga < 0.004) continue;
                const d = clickPulseHeadRadius(p.narrow) * (1 - k / 12) * 2;
                ctx.globalAlpha = Math.min(1, ga);
                ctx.drawImage(pulseSprite, g.x - d / 2, g.y - d / 2, d, d);
              }
              const h = clickPulseHead(p, age);
              const ha =
                h.alpha *
                clickPulseEnergyAt(energy(h.x, h.y)) *
                revealFactorAt(h.x, h.y);
              if (ha >= 0.004) {
                const d = clickPulseHeadRadius(p.narrow) * 2;
                ctx.globalAlpha = Math.min(1, ha);
                ctx.drawImage(pulseSprite, h.x - d / 2, h.y - d / 2, d, d);
                // Hard white core: the head's signature — a hot dot
                // inside the glow, a different kind of object from
                // the ambient soft orbs (mobile critic, iter 31: the
                // head was camouflaged at 390px).
                const coreSprite = pulseCoreSpriteRef.current;
                if (coreSprite) {
                  const cd = d * 0.5;
                  ctx.drawImage(
                    coreSprite,
                    h.x - cd / 2,
                    h.y - cd / 2,
                    cd,
                    cd,
                  );
                }
              }
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
          }
          // Probe hook for verification: the newest active pulse
          // head as "n:x,y,alpha" (n = active count), "0" when none.
          const newest = pulses[pulses.length - 1];
          const pulseProbe = newest
            ? (() => {
                const h = clickPulseHead(newest, t - newest.startT);
                return `${pulses.length}:${Math.round(h.x)},${Math.round(
                  h.y,
                )},${h.alpha.toFixed(2)}`;
              })()
            : "0";
          if (pulseProbe !== lastPulseProbe) {
            lastPulseProbe = pulseProbe;
            canvas.dataset.clickPulse = pulseProbe;
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

    // Click pulse (run-10 iter 31, RUN10-CLICK-PULSE): a pointer
    // click anywhere spawns a pulse at the click point that travels
    // along the bright band's slope. Passive — never interferes with
    // the click itself. Registered only in the full-motion branch
    // below; reduced motion has no listener and no pulses.
    const onPointerDown = (e: PointerEvent) => {
      const narrow = W < 700;
      const host = (narrow ? NARROW_RIBBONS : DESKTOP_RIBBONS).find(
        (b) => b.role === "bright",
      );
      const spawned = clickPulseSpawn(pulses, {
        x0: e.clientX,
        y0: e.clientY,
        // Field-mode fan (RUN10-PRESETS): the pulse rides the bright
        // band's fanned slope, so it stays on the band in Diagonal.
        slope: (host?.slope ?? 0.2) * chapterCur.fan + chapterCur.slope,
        startT: performance.now(),
        narrow,
      });
      pulses.length = 0;
      pulses.push(...spawned);
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
      window.addEventListener("pointerdown", onPointerDown, {
        passive: true,
      });
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
      window.removeEventListener("pointerdown", onPointerDown);
      if (root.getAttribute("data-ascii") === "active") {
        root.removeAttribute("data-ascii");
      }
      if (root.dataset.lightPreset) {
        delete root.dataset.lightPreset;
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
