import { describe, expect, it } from "vitest";

import {
  BOOT_OVERLAY_SELECTOR,
  BOOT_WAIT_CAP_MS,
  CHAPTER_PROFILES,
  DAYLIGHT_CHASE_RATE,
  DAYLIGHT_IDENTITY,
  DAYLIGHT_PROFILES,
  DITHER_SEAM_HEIGHT,
  FIELD_MODES,
  GLYPH_STREAM_FLOOR,
  GLYPH_STREAM_MIN_BAND_PX,
  GLYPH_STREAM_SIZE_PX,
  GLYPH_STREAM_SPACING_PX,
  GLYPH_STREAM_SPEED_PX_S,
  LIGHT_PRESETS,
  REVEAL_DURATION_MS,
  REVEAL_FEATHER_PX,
  REVEAL_RING_THICKNESS_PX,
  SCRUB_CHASE_RATE,
  SCRUB_CYCLES,
  VELOCITY_ATTACK_RATE,
  VELOCITY_DECAY_RATE,
  VELOCITY_DRIFT_BOOST,
  VELOCITY_FULL_SPEED,
  VELOCITY_SPEED_BOOST,
  applyLightPreset,
  bootExpected,
  chaseValue,
  daylightSetForHour,
  dissolveLevelAt,
  ditherSeamPasses,
  getChapterProfile,
  glyphStreamAlpha,
  glyphStreamBandFactor,
  glyphStreamMarginBands,
  glyphStreamX,
  lerpChapterProfile,
  lerpDaylightProfile,
  measureScrollVelocity,
  modeBandY0,
  resolveActiveChapter,
  revealAt,
  revealMaxRadius,
  revealRadiusProgress,
  revealRingAlpha,
  ribbonCenterY,
  rotateHue,
  scrubPhaseOffset,
  scrollProgress,
  seamDrawY,
  velocityEnvelopeStep,
  velocityEnvelopeTarget,
} from "./light-ribbons";

describe("light-ribbon chapters", () => {
  it("declares a profile for every section on the page", () => {
    for (const name of [
      "hero",
      "about",
      "publications",
      "experience",
      "projects",
      "skills",
      "contact",
      "epilogue",
    ]) {
      expect(CHAPTER_PROFILES[name]).toBeDefined();
    }
  });

  it("keeps the hero profile as the identity (the approved reference look)", () => {
    // RUN10-PRESETS: the hero keeps the frost identity PRESET (hue 0,
    // tintMix 0 — its colors pass through untouched) and takes the Halo
    // FIELD MODE (the item names "hero Halo"); the mode numbers are
    // part of the identity now, so they are pinned here too.
    expect(CHAPTER_PROFILES.hero).toEqual({
      slope: 0,
      thick: 1,
      alpha: 1,
      speed: 1,
      pale: 1,
      deep: 1,
      bright: 1,
      preset: "frost",
      mode: "halo",
      hue: 0,
      tint: { r: 125, g: 211, b: 252 },
      tintMix: 0,
      centerPull: 0.45,
      fan: 0.9,
      spread: 0.75,
      mirror: 1,
      bottomPull: 0,
    });
  });

  it("dims the closing chapters below the hero", () => {
    expect(CHAPTER_PROFILES.contact.alpha).toBeLessThan(1);
    expect(CHAPTER_PROFILES.epilogue.alpha).toBeLessThan(
      CHAPTER_PROFILES.contact.alpha,
    );
    expect(CHAPTER_PROFILES.projects.alpha).toBeGreaterThan(
      CHAPTER_PROFILES.contact.alpha,
    );
  });

  it("keeps projects the brightest chapter by a clear margin", () => {
    // Run-7 iter 8 in-iteration tuning: the mobile critic read about /
    // skills as brighter than projects in stills because the transient
    // flare happened to sit in those frames. The persistent bands must
    // carry the hierarchy on their own, so projects leads every other
    // chapter's alpha by at least 0.2.
    for (const [name, profile] of Object.entries(CHAPTER_PROFILES)) {
      if (name === "projects") continue;
      expect(CHAPTER_PROFILES.projects.alpha - profile.alpha).toBeGreaterThanOrEqual(
        0.2,
      );
    }
  });

  it("lifts only the projects bright role, so its peak band leads", () => {
    // Round-2 reconciliation: two mobile critics read projects mid-pack
    // at 390px even though its mean luma led every run — the eye ranks
    // chapters by peak local brightness, not the mean, and a plain alpha
    // lift only raises the mean. The bright role is the peak carrier,
    // so projects lifts it 1.5x while every other chapter stays at 1 —
    // except publications (fix4): its diagonal band read faint at
    // desktop (+43% luminance vs before, but dim in absolute terms),
    // so it lifts to 1.25, still below projects.
    expect(CHAPTER_PROFILES.projects.bright).toBe(1.5);
    expect(CHAPTER_PROFILES.publications.bright).toBe(1.25);
    for (const [name, profile] of Object.entries(CHAPTER_PROFILES)) {
      if (name === "projects" || name === "publications") continue;
      expect(profile.bright).toBe(1);
    }
    const mid = lerpChapterProfile(
      CHAPTER_PROFILES.hero,
      CHAPTER_PROFILES.projects,
      0.5,
    );
    expect(mid.bright).toBeCloseTo(1.25);
  });

  it("falls back to the hero profile for unknown or missing chapter names", () => {
    expect(getChapterProfile("nope")).toEqual(CHAPTER_PROFILES.hero);
    expect(getChapterProfile(null)).toEqual(CHAPTER_PROFILES.hero);
    expect(getChapterProfile("projects")).toEqual(CHAPTER_PROFILES.projects);
  });

  it("interpolates profiles linearly", () => {
    const mid = lerpChapterProfile(
      CHAPTER_PROFILES.hero,
      CHAPTER_PROFILES.contact,
      0.5,
    );
    expect(mid.alpha).toBeCloseTo(
      (CHAPTER_PROFILES.hero.alpha + CHAPTER_PROFILES.contact.alpha) / 2,
    );
    expect(mid.slope).toBeCloseTo(CHAPTER_PROFILES.contact.slope / 2);
    expect(lerpChapterProfile(CHAPTER_PROFILES.hero, CHAPTER_PROFILES.about, 0)).toEqual(
      CHAPTER_PROFILES.hero,
    );
    expect(lerpChapterProfile(CHAPTER_PROFILES.hero, CHAPTER_PROFILES.about, 1)).toEqual(
      CHAPTER_PROFILES.about,
    );
  });

  it("resolves the section owning the viewport center", () => {
    const rects = [
      { name: "hero", top: -800, bottom: 0 },
      { name: "about", top: 0, bottom: 900 },
      { name: "publications", top: 900, bottom: 1800 },
    ];
    expect(resolveActiveChapter(rects, 400)).toBe("about");
    expect(resolveActiveChapter(rects, 1200)).toBe("publications");
  });

  it("keeps the last section scrolled past when the center is in a gap", () => {
    const rects = [
      { name: "hero", top: -800, bottom: -100 },
      { name: "about", top: 100, bottom: 900 },
    ];
    expect(resolveActiveChapter(rects, 0)).toBe("hero");
  });

  it("falls back to the first section above the page top", () => {
    const rects = [
      { name: "hero", top: 200, bottom: 1000 },
      { name: "about", top: 1000, bottom: 1900 },
    ];
    expect(resolveActiveChapter(rects, 100)).toBe("hero");
  });

  it("returns null when no chaptered section exists", () => {
    expect(resolveActiveChapter([], 400)).toBeNull();
  });

  it("gives the last chapter the viewport at the very bottom of the page", () => {
    const rects = [
      { name: "contact", top: -400, bottom: 600 },
      { name: "epilogue", top: 600, bottom: 750 },
    ];
    // Center sits in contact, but the page is scrolled to the bottom.
    expect(resolveActiveChapter(rects, 400, true)).toBe("epilogue");
    expect(resolveActiveChapter(rects, 400, false)).toBe("contact");
    expect(resolveActiveChapter(rects, 650, false)).toBe("epilogue");
  });
});

describe("light presets (RUN10-PRESETS)", () => {
  it("keeps every preset a modest tint inside the cyan family", () => {
    for (const preset of Object.values(LIGHT_PRESETS)) {
      expect(Math.abs(preset.hue)).toBeLessThanOrEqual(20);
      expect(preset.tintMix).toBeGreaterThanOrEqual(0);
      expect(preset.tintMix).toBeLessThanOrEqual(0.65);
      for (const v of [preset.tint.r, preset.tint.g, preset.tint.b]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
    // Frost is the identity preset: hue 0, no tint.
    expect(LIGHT_PRESETS.frost.hue).toBe(0);
    expect(LIGHT_PRESETS.frost.tintMix).toBe(0);
  });

  it("gives the hero the frost preset + halo mode, contact the golden hour + edge glass", () => {
    expect(CHAPTER_PROFILES.hero.preset).toBe("frost");
    expect(CHAPTER_PROFILES.hero.mode).toBe("halo");
    expect(CHAPTER_PROFILES.contact.preset).toBe("goldenHour");
    // Fix3: contact takes edgeGlass (not halo) so its gold gets the
    // top-tail boost and a bottom-anchored band — its halo ring sat
    // mid-frame behind the panel, invisible, while the warmth never
    // reached the mid/bottom of the frame.
    expect(CHAPTER_PROFILES.contact.mode).toBe("edgeGlass");
  });

  it("keeps iceHalo legible at a glance (fix5)", () => {
    // Takeover-3 reconciliation: the desktop critic + two phase
    // samples read experience / epilogue as lights-off at desktop —
    // the pale tint at 0.4 over the dim chapter profiles fell below
    // the glance threshold (the same fix2 lesson as gold). The mix
    // goes to 0.6 so the ice-white tint carries the identity, and the
    // two ice chapters get more light; projects still leads every
    // other chapter's alpha by at least 0.2, and epilogue stays
    // below contact.
    expect(LIGHT_PRESETS.iceHalo.tintMix).toBe(0.6);
    expect(CHAPTER_PROFILES.experience.alpha).toBe(1);
    expect(CHAPTER_PROFILES.epilogue.alpha).toBe(0.8);
  });

  it("carries experience's bands across the middle (fix6)", () => {
    // Fix5's parameter bump moved experience only from "invisible" to
    // "a visible edge strip" — the fix5 desktop critic measured the
    // content zone the darkest in the set (mean 13.6) with light only
    // in a top strip. That is edgeGlass doing its job: it pushes bands
    // to the top/bottom edges so the middle reads as glass — but
    // experience's viewport IS the middle (dense text column). Diagonal
    // fans the slopes into bands across the middle, the shape
    // publications already proves at desktop. Pair stays unique.
    expect(CHAPTER_PROFILES.experience.mode).toBe("diagonal");
    expect(CHAPTER_PROFILES.experience.preset).toBe("iceHalo");
  });

  it("gives every chapter a unique preset/mode pair", () => {
    const pairs = Object.values(CHAPTER_PROFILES).map(
      (p) => `${p.preset}/${p.mode}`,
    );
    expect(new Set(pairs).size).toBe(Object.keys(CHAPTER_PROFILES).length);
  });

  it("rotates hue around the wheel and leaves greys alone", () => {
    const red = { r: 255, g: 0, b: 0 };
    expect(rotateHue(red, 0)).toEqual(red);
    expect(rotateHue(red, 360)).toEqual(red);
    const green = rotateHue(red, 120);
    expect(green.g).toBeGreaterThan(245);
    expect(green.r).toBeLessThan(10);
    expect(green.b).toBeLessThan(10);
    const blue = { r: 0, g: 0, b: 255 };
    const cyan = rotateHue(blue, -60);
    expect(cyan.g).toBeGreaterThan(245);
    expect(cyan.b).toBeGreaterThan(245);
    expect(cyan.r).toBeLessThan(10);
    expect(rotateHue({ r: 128, g: 128, b: 128 }, 90)).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
  });

  it("applies a preset as hue rotation + tint mix, identity at frost", () => {
    const colors = {
      deep: { r: 69, g: 116, b: 139 },
      bright: { r: 163, g: 222, b: 253 },
      pale: { r: 186, g: 230, b: 253 },
      accent: { r: 125, g: 211, b: 252 },
    };
    expect(applyLightPreset(colors, LIGHT_PRESETS.frost)).toEqual(colors);
    const tinted = applyLightPreset(colors, {
      hue: 0,
      tint: { r: 10, g: 20, b: 30 },
      tintMix: 1,
    });
    for (const role of ["deep", "bright", "pale", "accent"] as const) {
      expect(tinted[role]).toEqual({ r: 10, g: 20, b: 30 });
    }
    // Golden hour warms the accent: red up, blue down, still cyan.
    // Fix2: at a 0.45 mix the base cyan's green still led and the
    // chapter read olive, not golden — at 0.6 toward the redder gold
    // tint, red leads green leads blue: actual gold.
    const golden = applyLightPreset(colors, LIGHT_PRESETS.goldenHour);
    expect(golden.accent.r).toBeGreaterThan(colors.accent.r);
    expect(golden.accent.b).toBeLessThan(colors.accent.b);
    expect(golden.accent.r).toBeGreaterThan(golden.accent.g);
    expect(golden.accent.g).toBeGreaterThan(golden.accent.b);
    // Aurora vs iceHalo must read as different chapters: aurora is
    // near-balanced teal-green (blue barely leads green), iceHalo is
    // clearly blue-led. The gap between their blue-green leads is
    // the distinction.
    const aurora = applyLightPreset(colors, LIGHT_PRESETS.aurora);
    const ice = applyLightPreset(colors, LIGHT_PRESETS.iceHalo);
    expect(ice.accent.b - ice.accent.g).toBeGreaterThan(
      aurora.accent.b - aurora.accent.g + 15,
    );
  });

  it("moves band y0 toward the center, away from it, or not at all", () => {
    expect(modeBandY0(0.1, 0, 1)).toBeCloseTo(0.1);
    expect(modeBandY0(0.1, 1, 1)).toBeCloseTo(0.5);
    expect(modeBandY0(0.9, 1, 1)).toBeCloseTo(0.5);
    // Pushed to the edges: 0.1 goes below the viewport top (clamped),
    // 0.9 goes past the bottom (clamped).
    expect(modeBandY0(0.1, -1, 1)).toBe(-0.15);
    expect(modeBandY0(0.9, -1, 1)).toBe(1.15);
    // No spread collapses every band onto the center.
    expect(modeBandY0(0.1, 0, 0)).toBeCloseTo(0.5);
    expect(modeBandY0(0.9, 0, 0)).toBeCloseTo(0.5);
  });

  it("lerps the preset + mode numbers through the chapter crossfade", () => {
    const mid = lerpChapterProfile(
      CHAPTER_PROFILES.hero,
      CHAPTER_PROFILES.publications,
      0.5,
    );
    expect(mid.hue).toBeCloseTo(
      (CHAPTER_PROFILES.hero.hue + CHAPTER_PROFILES.publications.hue) / 2,
    );
    expect(mid.tintMix).toBeCloseTo(
      (CHAPTER_PROFILES.hero.tintMix +
        CHAPTER_PROFILES.publications.tintMix) /
        2,
    );
    expect(mid.tint.r).toBeCloseTo(
      (CHAPTER_PROFILES.hero.tint.r +
        CHAPTER_PROFILES.publications.tint.r) /
        2,
    );
    expect(mid.centerPull).toBeCloseTo(
      (CHAPTER_PROFILES.hero.centerPull +
        CHAPTER_PROFILES.publications.centerPull) /
        2,
    );
    expect(mid.fan).toBeCloseTo(
      (CHAPTER_PROFILES.hero.fan + CHAPTER_PROFILES.publications.fan) / 2,
    );
    expect(mid.spread).toBeCloseTo(
      (CHAPTER_PROFILES.hero.spread +
        CHAPTER_PROFILES.publications.spread) /
        2,
    );
    expect(mid.mirror).toBeCloseTo(
      (CHAPTER_PROFILES.hero.mirror +
        CHAPTER_PROFILES.publications.mirror) /
        2,
    );
    // Names follow the "from" chapter until the exact endpoint —
    // the lerp endpoint invariant (k=0 → a, k=1 → b) stays exact.
    expect(mid.preset).toBe(CHAPTER_PROFILES.hero.preset);
    expect(mid.mode).toBe(CHAPTER_PROFILES.hero.mode);
    expect(
      lerpChapterProfile(CHAPTER_PROFILES.hero, CHAPTER_PROFILES.contact, 0),
    ).toEqual(CHAPTER_PROFILES.hero);
    expect(
      lerpChapterProfile(CHAPTER_PROFILES.hero, CHAPTER_PROFILES.contact, 1),
    ).toEqual(CHAPTER_PROFILES.contact);
  });

  it("keeps the identity mode equal to the old centerline, and gathers/fans with a mode", () => {
    const band = {
      y0: -0.04,
      slope: 0.14,
      th: 205,
      alpha: 0.48,
      role: "deep" as const,
      a1: 50,
      f1: 0.0042,
      p1: 6050,
      a2: 25,
      f2: 0.0095,
      p2: 7425,
      drift: 105,
      dp: 7150,
      ga: 31,
      gp: 7350,
      gph: 0.0,
      bd: 0.22,
      bp: 5670,
      bph: 0.0,
    };
    const identity = { centerPull: 0, fan: 1, spread: 1, mirror: 0, bottomPull: 0 };
    expect(
      ribbonCenterY(band, 720, 3500, 0.05, 800, 0, 1, identity),
    ).toBeCloseTo(ribbonCenterY(band, 720, 3500, 0.05, 800, 0, 1), 9);
    // Halo gathers the off-screen-top band down into the viewport.
    const halo = ribbonCenterY(
      band,
      0,
      1000,
      0,
      800,
      0,
      1,
      FIELD_MODES.halo,
    );
    const plain = ribbonCenterY(band, 0, 1000, 0, 800, 0, 1, identity);
    expect(halo - plain).toBeGreaterThan(100);
    // Diagonal fans the slope: at x=720 the centerline sits a full
    // slope-step lower than the identity mode (wobble terms cancel —
    // same ct and x in both calls).
    const diagonal = ribbonCenterY(
      band,
      720,
      3500,
      0,
      800,
      0,
      1,
      FIELD_MODES.diagonal,
    );
    const base = ribbonCenterY(band, 720, 3500, 0, 800, 0, 1, identity);
    expect(diagonal - base).toBeGreaterThan(50);
  });

  it("folds the lowest band to the bottom anchor in edge-glass modes", () => {
    // The lowest desktop band (accent, y0 0.36) — values verbatim
    // from DESKTOP_RIBBONS[3].
    const lowBand = {
      y0: 0.36,
      slope: 0.28,
      th: 225,
      alpha: 0.3,
      role: "accent" as const,
      a1: 65,
      f1: 0.0031,
      p1: 7700,
      a2: 33,
      f2: 0.007,
      p2: 5940,
      drift: 120,
      dp: 6875,
      ga: 39,
      gp: 9450,
      gph: 1.2,
      bd: 0.23,
      bp: 5460,
      bph: 5.1,
    };
    const edge = FIELD_MODES.edgeGlass;
    // Fix3: edge-glass folds in two steps — center mirror, then the
    // bottom pull to the 0.85H anchor. Without the mirror the band
    // sits above the center (0.25 * 800); with it, it rests at
    // 0.85 * 800 — the wobble terms cancel in the difference, so the
    // fold is exactly 0.6 * 800.
    const plain = ribbonCenterY(lowBand, 0, 1000, 0, 800, 0, 1, edge, false);
    const folded = ribbonCenterY(lowBand, 0, 1000, 0, 800, 0, 1, edge, true);
    expect(plain).toBeLessThan(400);
    expect(folded).toBeGreaterThan(600);
    // The fold: (0.85 - y0t) * H, with y0t the edge-glass transform
    // of 0.36 — the wobble terms cancel in the difference, so it is
    // ~480px, not a rounding error.
    const fold = folded - plain;
    expect(fold).toBeGreaterThan(430);
    expect(fold).toBeLessThan(530);
    // A half mirror weight sweeps the band partway down — the
    // two-step fold is not linear in the weight (center mirror, then
    // bottom pull), but it must be strictly between plain and folded,
    // never a snap.
    const half = ribbonCenterY(
      lowBand,
      0,
      1000,
      0,
      800,
      0,
      1,
      { ...edge, mirror: 0.5 },
      true,
    );
    expect(half).toBeGreaterThan(plain + 300);
    expect(half).toBeLessThan(folded);
    // The narrow profile's low band (y0 0.62) now folds too — fix3:
    // it sits at ~0.71H on its own, below the center, so the old
    // center mirror never fired and the bottom third had no band at
    // all. The bottom pull moves it to the 0.85H anchor (~109px).
    const narrowLow = { ...lowBand, y0: 0.62 };
    const nPlain = ribbonCenterY(
      narrowLow,
      0,
      1000,
      0,
      800,
      0,
      1,
      edge,
      false,
    );
    const nFolded = ribbonCenterY(
      narrowLow,
      0,
      1000,
      0,
      800,
      0,
      1,
      edge,
      true,
    );
    expect(nPlain).toBeGreaterThan(400);
    expect(nFolded).toBeGreaterThan(nPlain);
    expect(nFolded - nPlain).toBeGreaterThan(80);
    expect(nFolded - nPlain).toBeLessThan(140);
    // Halo keeps the center mirror (no bottom pull): the same band
    // folds to 1 - y0t ≈ 0.56H — the ring around the name, not the
    // bottom anchor. (Absolute positions carry the ±65px wobble at
    // this x/t, so the bound is wide; the edge-glass comparison
    // below it is the sharp one.)
    const halo = FIELD_MODES.halo;
    const hFolded = ribbonCenterY(lowBand, 0, 1000, 0, 800, 0, 1, halo, true);
    expect(hFolded).toBeGreaterThan(400);
    expect(hFolded).toBeLessThan(560);
    expect(hFolded).toBeLessThan(folded);
  });
});

describe("dither seam", () => {
  it("keeps the seam band at 96px", () => {
    expect(DITHER_SEAM_HEIGHT).toBe(96);
  });

  it("ramps the dissolve level 0 → 1 → 0 across the band, clamped outside", () => {
    // Symmetric: the level peaks at the band center (the hero edge)
    // and returns to 0 at both ends, so neither side has a hard edge.
    expect(dissolveLevelAt(0, 0, 96)).toBe(0);
    expect(dissolveLevelAt(96, 0, 96)).toBe(0);
    expect(dissolveLevelAt(48, 0, 96)).toBe(1);
    expect(dissolveLevelAt(24, 0, 96)).toBeCloseTo(0.5);
    expect(dissolveLevelAt(72, 0, 96)).toBeCloseTo(0.5);
    expect(dissolveLevelAt(-10, 0, 96)).toBe(0);
    expect(dissolveLevelAt(200, 0, 96)).toBe(0);
  });

  it("passes no pixels at level 0 and every pixel at level 1", () => {
    let none = 0;
    let all = 0;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        if (ditherSeamPasses(x, y, 0)) none++;
        if (ditherSeamPasses(x, y, 1)) all++;
      }
    }
    expect(none).toBe(0);
    expect(all).toBe(128 * 128);
  });

  it("passes exactly half the tile at level 0.5 (flat blue-noise histogram)", () => {
    // lib/blue-noise.ts: each value 0..255 occurs exactly 64 times, so
    // values < 128 number 128 * 64 = 8192 — the sweep is uniform.
    let count = 0;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        if (ditherSeamPasses(x, y, 0.5)) count++;
      }
    }
    expect(count).toBe(8192);
  });

  it("wraps the threshold tile toroidally past 128px", () => {
    expect(ditherSeamPasses(0, 0, 0.5)).toBe(
      ditherSeamPasses(128, 128, 0.5),
    );
    expect(ditherSeamPasses(200, 300, 0.5)).toBe(
      ditherSeamPasses(200 - 128, 300 - 256, 0.5),
    );
  });

  it("centers the band on the hero edge and hides it off-screen", () => {
    // Hero bottom at the viewport bottom: the band straddles the fold.
    expect(seamDrawY(800, 800)).toBe(800 - 48);
    // Hero bottom mid-viewport: the whole band is visible.
    expect(seamDrawY(400, 800)).toBe(352);
    // Hero bottom just above the viewport: the band's tail still shows.
    expect(seamDrawY(0, 800)).toBe(-48);
    // Fully scrolled past, or not yet reached: no seam.
    expect(seamDrawY(-200, 800)).toBeNull();
    expect(seamDrawY(1000, 800)).toBeNull();
  });
});

describe("scroll scrub", () => {
  it("keeps the scrub at 1.25 phase cycles over a full page", () => {
    expect(SCRUB_CYCLES).toBe(1.25);
    expect(SCRUB_CHASE_RATE).toBe(4);
  });

  it("maps scroll position to progress in [0,1], clamped", () => {
    expect(scrollProgress(0, 1000)).toBe(0);
    expect(scrollProgress(500, 1000)).toBe(0.5);
    expect(scrollProgress(1000, 1000)).toBe(1);
    expect(scrollProgress(1500, 1000)).toBe(1);
    expect(scrollProgress(-50, 1000)).toBe(0);
    expect(scrollProgress(500, 0)).toBe(0);
    expect(scrollProgress(500, -100)).toBe(0);
  });

  it("turns progress into a phase offset of 1.25 cycles at the bottom", () => {
    expect(scrubPhaseOffset(0)).toBe(0);
    expect(scrubPhaseOffset(0.5)).toBeCloseTo(0.625 * 2 * Math.PI);
    expect(scrubPhaseOffset(1)).toBeCloseTo(1.25 * 2 * Math.PI);
    expect(scrubPhaseOffset(2)).toBeCloseTo(1.25 * 2 * Math.PI);
    expect(scrubPhaseOffset(-1)).toBe(0);
  });

  it("chases toward the target without overshooting, frame-rate independent", () => {
    // No time elapsed, or no rate: no movement.
    expect(chaseValue(3, 10, 4, 0)).toBe(3);
    expect(chaseValue(3, 10, 0, 1)).toBe(3);
    // One quarter-second at rate 4 covers 1 - e^-1 of the gap.
    expect(chaseValue(0, 10, 4, 0.25)).toBeCloseTo(10 * (1 - Math.exp(-1)), 6);
    // Two seconds at rate 4 is 99.97% of the way there, never past it.
    const settled = chaseValue(0, 10, 4, 2);
    expect(settled).toBeGreaterThan(9.99);
    expect(settled).toBeLessThanOrEqual(10);
    // Chasing down stays inside the gap too.
    const down = chaseValue(10, 0, 4, 0.25);
    expect(down).toBeGreaterThanOrEqual(0);
    expect(down).toBeLessThan(10);
  });

  // One narrow-screen band, values verbatim from NARROW_RIBBONS[0].
  const band = {
    y0: -0.04,
    slope: 0.14,
    th: 205,
    alpha: 0.48,
    role: "deep" as const,
    a1: 50,
    f1: 0.0042,
    p1: 6050,
    a2: 25,
    f2: 0.0095,
    p2: 7425,
    drift: 105,
    dp: 7150,
    ga: 31,
    gp: 7350,
    gph: 0.0,
    bd: 0.22,
    bp: 5670,
    bph: 0.0,
  };

  it("returns the band to its ambient position after one full scrub cycle", () => {
    // A 2π offset is exactly one phase-travel cycle for every band, so
    // the centerline must be identical — the scrub is a pure phase
    // advance, and scrolling to the bottom and back leaves the light
    // where it was (modulo wall-clock drift).
    const ambient = ribbonCenterY(band, 0, 1000, 0, 800, 0);
    expect(ribbonCenterY(band, 0, 1000, 0, 800, 2 * Math.PI)).toBeCloseTo(
      ambient,
      6,
    );
    expect(ribbonCenterY(band, 720, 3500, 0.05, 800, 2 * Math.PI)).toBeCloseTo(
      ribbonCenterY(band, 720, 3500, 0.05, 800, 0),
      6,
    );
  });

  it("moves the band measurably at half a scrub cycle", () => {
    const ambient = ribbonCenterY(band, 0, 1000, 0, 800, 0);
    const scrubbed = ribbonCenterY(band, 0, 1000, 0, 800, Math.PI);
    expect(Math.abs(scrubbed - ambient)).toBeGreaterThan(10);
  });
});

describe("scroll velocity", () => {
  it("keeps the velocity constants at their designed values", () => {
    expect(VELOCITY_FULL_SPEED).toBe(1500);
    expect(VELOCITY_ATTACK_RATE).toBe(8);
    expect(VELOCITY_DECAY_RATE).toBe(1.2);
    // Large by design (in-iteration tuning): at +2x phase / +0.5x
    // drift the A/B canvas rate was only 1.29-1.34x and two fresh
    // strict critics could not tell the new build from the old in
    // stills — a rate change has to be big to read as a response.
    expect(VELOCITY_SPEED_BOOST).toBe(6.0);
    expect(VELOCITY_DRIFT_BOOST).toBe(2.0);
    // Fast attack, slow decay — the light answers the fling quickly
    // and settles back over about a second at rest.
    expect(VELOCITY_ATTACK_RATE).toBeGreaterThan(VELOCITY_DECAY_RATE);
  });

  it("maps absolute scroll velocity to an envelope target in [0,1]", () => {
    expect(velocityEnvelopeTarget(0)).toBe(0);
    expect(velocityEnvelopeTarget(750)).toBe(0.5);
    expect(velocityEnvelopeTarget(1500)).toBe(1);
    expect(velocityEnvelopeTarget(3000)).toBe(1);
    expect(velocityEnvelopeTarget(-100)).toBe(0);
    expect(velocityEnvelopeTarget(Number.NaN)).toBe(0);
  });

  it("attacks fast and decays slow, never overshooting", () => {
    // A quarter-second of full-velocity scrolling at attack rate 8
    // covers 1 - e^-2 of the gap — the envelope is mostly engaged.
    const attacked = velocityEnvelopeStep(0, 1, 0.25);
    expect(attacked).toBeCloseTo(1 - Math.exp(-2), 6);
    expect(attacked).toBeLessThanOrEqual(1);
    // The same quarter-second at rest only decays 1 - e^-0.3 — the
    // envelope lingers, settling back over about a second.
    const decayed = velocityEnvelopeStep(1, 0, 0.25);
    expect(decayed).toBeCloseTo(Math.exp(-0.3), 6);
    expect(decayed).toBeGreaterThan(0.5);
    expect(decayed).toBeLessThan(1);
    // No time elapsed: no movement either way.
    expect(velocityEnvelopeStep(0.4, 1, 0)).toBe(0.4);
    expect(velocityEnvelopeStep(0.4, 0, 0)).toBe(0.4);
  });

  it("measures true scroll velocity against wall-clock time", () => {
    // 100px in 100ms is 1000px/s; 100px in 1s is 100px/s — the rate
    // is px per REAL second, so a slow frame interval does not
    // inflate it (the clamped-dt read did: iter 16c).
    expect(measureScrollVelocity(0, 100, 0, 100)).toBe(1000);
    expect(measureScrollVelocity(0, 100, 0, 1000)).toBe(100);
    expect(measureScrollVelocity(500, 500, 0, 100)).toBe(0);
    expect(measureScrollVelocity(0, 100, 100, 0)).toBeNull();
    expect(measureScrollVelocity(0, 100, 100, 100)).toBeNull();
    // Scrolling up measures the same magnitude.
    expect(measureScrollVelocity(1000, 900, 0, 100)).toBe(1000);
  });

  it("widens the drift swing at full envelope and is a no-op at rest", () => {
    const band = {
      y0: -0.04,
      slope: 0.14,
      th: 205,
      alpha: 0.48,
      role: "deep" as const,
      a1: 50,
      f1: 0.0042,
      p1: 6050,
      a2: 25,
      f2: 0.0095,
      p2: 7425,
      drift: 105,
      dp: 7150,
      ga: 31,
      gp: 7350,
      gph: 0.0,
      bd: 0.22,
      bp: 5670,
      bph: 0.0,
    };
    // driftScale defaults to 1: identical to the explicit 1.0 call.
    const rest = ribbonCenterY(band, 720, 1000, 0, 800, 0);
    expect(ribbonCenterY(band, 720, 1000, 0, 800, 0, 1)).toBe(rest);
    // At 1.5x drift the centerline moves measurably — the bands swing
    // wider mid-fling.
    const boosted = ribbonCenterY(band, 720, 1000, 0, 800, 0, 1.5);
    expect(Math.abs(boosted - rest)).toBeGreaterThan(1);
  });
});

describe("daylight sets", () => {
  it("maps local hours to the four sets at the documented boundaries", () => {
    // Night 20–05, morning 05–11, day 11–17, dusk 17–20.
    expect(daylightSetForHour(0)).toBe("night");
    expect(daylightSetForHour(4)).toBe("night");
    expect(daylightSetForHour(5)).toBe("morning");
    expect(daylightSetForHour(10)).toBe("morning");
    expect(daylightSetForHour(11)).toBe("day");
    expect(daylightSetForHour(16)).toBe("day");
    expect(daylightSetForHour(17)).toBe("dusk");
    expect(daylightSetForHour(19)).toBe("dusk");
    expect(daylightSetForHour(20)).toBe("night");
    expect(daylightSetForHour(23)).toBe("night");
    // Fractional hours floor to the hour; out-of-range wraps mod 24.
    expect(daylightSetForHour(10.9)).toBe("morning");
    expect(daylightSetForHour(24)).toBe("night");
    expect(daylightSetForHour(29)).toBe("morning");
  });

  it("falls back to the brightest set for a non-finite hour", () => {
    expect(daylightSetForHour(Number.NaN)).toBe("day");
    expect(daylightSetForHour(Number.POSITIVE_INFINITY)).toBe("day");
  });

  it("keeps every set a modest multiplier inside the cyan family — no new hue, no washout", () => {
    // All multipliers stay in [0.7, 1.5]: a set rebalances the light,
    // it never doubles it or kills it. The 1.5 cap is the night flare
    // (the lantern glow); the 2.0x day/night alpha gap is deliberate
    // (in-iteration tuning — a 1.44x gap was invisible against the
    // ±20% brightness breathing, so the gap has to exceed it).
    for (const profile of Object.values(DAYLIGHT_PROFILES)) {
      for (const v of Object.values(profile)) {
        expect(v).toBeGreaterThanOrEqual(0.7);
        expect(v).toBeLessThanOrEqual(1.5);
      }
    }
    // The identity set is the approved reference look.
    expect(DAYLIGHT_IDENTITY).toEqual({
      alpha: 1,
      pale: 1,
      deep: 1,
      bright: 1,
      flare: 1,
    });
  });

  it("orders the sets by energy: day brightest, night dimmest with the strongest flare", () => {
    expect(DAYLIGHT_PROFILES.day.alpha).toBeGreaterThan(
      DAYLIGHT_PROFILES.morning.alpha,
    );
    expect(DAYLIGHT_PROFILES.morning.alpha).toBeGreaterThan(
      DAYLIGHT_PROFILES.dusk.alpha,
    );
    expect(DAYLIGHT_PROFILES.dusk.alpha).toBeGreaterThan(
      DAYLIGHT_PROFILES.night.alpha,
    );
    // Day lifts the pale wash most; night lifts the deep blues most.
    expect(DAYLIGHT_PROFILES.day.pale).toBeGreaterThan(
      DAYLIGHT_PROFILES.night.pale,
    );
    expect(DAYLIGHT_PROFILES.night.deep).toBeGreaterThan(
      DAYLIGHT_PROFILES.day.deep,
    );
    // Night is the lantern set: strongest flare contrast; day tames it.
    expect(DAYLIGHT_PROFILES.night.flare).toBeGreaterThan(
      DAYLIGHT_PROFILES.dusk.flare,
    );
    expect(DAYLIGHT_PROFILES.dusk.flare).toBeGreaterThan(
      DAYLIGHT_PROFILES.day.flare,
    );
  });

  it("interpolates sets linearly, endpoints exact", () => {
    const mid = lerpDaylightProfile(
      DAYLIGHT_PROFILES.day,
      DAYLIGHT_PROFILES.night,
      0.5,
    );
    expect(mid.alpha).toBeCloseTo(
      (DAYLIGHT_PROFILES.day.alpha + DAYLIGHT_PROFILES.night.alpha) / 2,
    );
    expect(mid.flare).toBeCloseTo(
      (DAYLIGHT_PROFILES.day.flare + DAYLIGHT_PROFILES.night.flare) / 2,
    );
    expect(
      lerpDaylightProfile(DAYLIGHT_IDENTITY, DAYLIGHT_PROFILES.dusk, 0),
    ).toEqual(DAYLIGHT_IDENTITY);
    expect(
      lerpDaylightProfile(DAYLIGHT_IDENTITY, DAYLIGHT_PROFILES.dusk, 1),
    ).toEqual(DAYLIGHT_PROFILES.dusk);
  });

  it("keeps the mount crossfade gradual: ~0.6/s settles in about 5s", () => {
    expect(DAYLIGHT_CHASE_RATE).toBe(0.6);
    // One second of chasing from identity toward night covers
    // 1 - e^-0.6 of the gap — visibly moving, not snapped.
    const after1s = chaseValue(1, 0.7, DAYLIGHT_CHASE_RATE, 1);
    expect(after1s).toBeCloseTo(1 - 0.3 * (1 - Math.exp(-0.6)), 6);
    expect(after1s).toBeGreaterThan(0.85);
    // Five seconds is ~95% settled.
    const after5s = chaseValue(1, 0.7, DAYLIGHT_CHASE_RATE, 5);
    expect(after5s).toBeCloseTo(0.71, 2);
  });
});

describe("opening ring-of-light reveal", () => {
  it("runs the radius 0 → 1 over the 2s window, clamped", () => {
    expect(REVEAL_DURATION_MS).toBe(2000);
    expect(revealRadiusProgress(0)).toBe(0);
    expect(revealRadiusProgress(REVEAL_DURATION_MS)).toBe(1);
    expect(revealRadiusProgress(REVEAL_DURATION_MS + 5000)).toBe(1);
    expect(revealRadiusProgress(-100)).toBe(0);
  });

  it("eases out — the wavefront moves fast early, then settles", () => {
    const mid = revealRadiusProgress(REVEAL_DURATION_MS / 2);
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(1);
    expect(revealRadiusProgress(250)).toBeGreaterThan(0.1);
    // Monotone: later is never smaller.
    expect(revealRadiusProgress(1500)).toBeGreaterThan(
      revealRadiusProgress(500),
    );
  });

  it("runs the ring alpha envelope 0 → peak → 0", () => {
    expect(revealRingAlpha(0)).toBe(0);
    expect(revealRingAlpha(REVEAL_DURATION_MS)).toBe(0);
    expect(revealRingAlpha(REVEAL_DURATION_MS + 1000)).toBe(0);
    const mid = revealRingAlpha(REVEAL_DURATION_MS / 2);
    expect(mid).toBeGreaterThan(0.8);
    // Fading in at 100ms (5% in, fade-in spans the first 12%) and
    // fading out at 1900ms (95% in, fade-out spans the last 25%).
    expect(revealRingAlpha(100)).toBeLessThan(mid);
    expect(revealRingAlpha(1900)).toBeLessThan(mid);
  });

  it("reveals points inside the front and hides points outside it", () => {
    const cx = 720;
    const cy = 400;
    const ringR = 300;
    expect(revealAt(cx, cy, cx, cy, ringR)).toBe(1);
    expect(
      revealAt(cx + ringR - 2 * REVEAL_FEATHER_PX, cy, cx, cy, ringR),
    ).toBe(1);
    expect(
      revealAt(cx + ringR + 2 * REVEAL_FEATHER_PX, cy, cx, cy, ringR),
    ).toBe(0);
    // Exactly on the front, half revealed.
    const atFront = revealAt(cx + ringR, cy, cx, cy, ringR);
    expect(atFront).toBeGreaterThan(0.4);
    expect(atFront).toBeLessThan(0.6);
  });

  it("covers the viewport at the farthest corner", () => {
    expect(revealMaxRadius(1440, 800, 720, 400)).toBeCloseTo(
      Math.hypot(720, 400),
    );
    expect(revealMaxRadius(1440, 800, 0, 0)).toBeCloseTo(
      Math.hypot(1440, 800),
    );
    expect(REVEAL_RING_THICKNESS_PX).toBeGreaterThan(0);
  });

  it("waits for the boot overlay only when a boot is expected", () => {
    // First visit: no flag, the boot runs and the reveal waits for it.
    expect(bootExpected(false)).toBe(true);
    // Repeat visit: the flag is set, no boot, reveal starts on mount.
    expect(bootExpected(true)).toBe(false);
    // RUN10-BOOT: the phone skip is gone — the light ring shows at
    // every width and pointer type, so there is no pointer/viewport
    // gate left to mirror (the old 390/640/641 expectations are dead).
    // Storage unavailable (null flag): expect the boot, matching the
    // boot's own fallback.
    expect(bootExpected(null)).toBe(true);
    // The cap bounds the wait past the boot's 3.05s unmount.
    expect(BOOT_WAIT_CAP_MS).toBeGreaterThan(3050);
    expect(BOOT_OVERLAY_SELECTOR).toContain("System boot sequence");
  });
});

describe("living ASCII glyph stream", () => {
  it("floors the glyph alpha so no phase ever vanishes", () => {
    // The v1 failure: alpha tied to the flare envelope read ~2.5x
    // over background in one phase and ~11x in another. The floor
    // bounds the swing to FLOOR..1.
    expect(glyphStreamAlpha(0)).toBe(GLYPH_STREAM_FLOOR);
    expect(glyphStreamAlpha(1)).toBe(1);
    expect(glyphStreamAlpha(0.5)).toBeCloseTo(
      GLYPH_STREAM_FLOOR + (1 - GLYPH_STREAM_FLOOR) * 0.5,
    );
    expect(glyphStreamAlpha(-1)).toBe(GLYPH_STREAM_FLOOR);
    expect(glyphStreamAlpha(2)).toBe(1);
    expect(GLYPH_STREAM_FLOOR).toBeGreaterThanOrEqual(0.5);
  });

  it("normalizes band breathing to [0,1] at the swing extremes", () => {
    expect(glyphStreamBandFactor(0.76, 0.24)).toBeCloseTo(0);
    expect(glyphStreamBandFactor(1.24, 0.24)).toBeCloseTo(1);
    expect(glyphStreamBandFactor(1.0, 0.24)).toBeCloseTo(0.5);
    expect(glyphStreamBandFactor(1.0, 0)).toBe(0.5);
    expect(glyphStreamBandFactor(0.5, 0.24)).toBeCloseTo(0);
    expect(glyphStreamBandFactor(1.5, 0.24)).toBeCloseTo(1);
  });

  it("draws only in free margins wide enough to read", () => {
    // 1440px: content column 120..1320 — only the right margin
    // (~96px) qualifies; the left is the rail strip.
    expect(glyphStreamMarginBands(1440, 120, 1320)).toEqual([
      [1344, 1416],
    ]);
    // 1920px: both margins qualify.
    const wide = glyphStreamMarginBands(1920, 360, 1560);
    expect(wide).toHaveLength(2);
    expect(wide[0][1] - wide[0][0]).toBeGreaterThanOrEqual(
      GLYPH_STREAM_MIN_BAND_PX,
    );
    expect(wide[1][1] - wide[1][0]).toBeGreaterThanOrEqual(
      GLYPH_STREAM_MIN_BAND_PX,
    );
    // Mobile: no margins by construction.
    expect(glyphStreamMarginBands(390, 16, 374)).toEqual([]);
    expect(glyphStreamMarginBands(699, 16, 683)).toEqual([]);
    // A margin narrower than the minimum is dropped.
    expect(glyphStreamMarginBands(1440, 120, 1380)).toEqual([]);
  });

  it("marches glyphs at stream speed and wraps continuously", () => {
    const x0 = glyphStreamX(0, 0, 36, 165, -100, 1540);
    expect(x0).toBe(0);
    // 1s of travel at 165px/s.
    expect(glyphStreamX(0, 1, 36, 165, -100, 1540)).toBeCloseTo(165);
    // 3s of travel: ~495px — a wholly different constellation in
    // the margin, not a nudge of the same glyphs.
    expect(glyphStreamX(0, 3, 36, 165, -100, 1540)).toBeCloseTo(495);
    // Spacing is preserved along the stream.
    expect(
      glyphStreamX(1, 0, 36, 165, -100, 1540) -
        glyphStreamX(0, 0, 36, 165, -100, 1540),
    ).toBe(36);
    // Wrap: past the right edge re-enters at the left.
    const wrapped = glyphStreamX(0, 10, 36, 165, -100, 1540);
    expect(wrapped).toBeGreaterThanOrEqual(-100);
    expect(wrapped).toBeLessThan(1540);
    expect(glyphStreamX(0, 10, 36, 165, -100, 1540)).toBeCloseTo(
      -100 + ((1650 + 100) % 1640),
    );
  });

  it("keeps the stream fast and the glyphs large enough to track", () => {
    // The flare's ~180px/s is the trackable reference; the stream
    // must be in the same class, not the band's ~4px/s drift.
    expect(GLYPH_STREAM_SPEED_PX_S).toBeGreaterThanOrEqual(120);
    expect(GLYPH_STREAM_SIZE_PX).toBeGreaterThanOrEqual(28);
    expect(GLYPH_STREAM_SPACING_PX).toBeLessThanOrEqual(48);
  });
});
