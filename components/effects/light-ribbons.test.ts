import { describe, expect, it } from "vitest";

import {
  CHAPTER_PROFILES,
  DITHER_SEAM_HEIGHT,
  SCRUB_CHASE_RATE,
  SCRUB_CYCLES,
  chaseValue,
  dissolveLevelAt,
  ditherSeamPasses,
  getChapterProfile,
  lerpChapterProfile,
  resolveActiveChapter,
  ribbonCenterY,
  scrubPhaseOffset,
  scrollProgress,
  seamDrawY,
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
    expect(CHAPTER_PROFILES.hero).toEqual({
      slope: 0,
      thick: 1,
      alpha: 1,
      speed: 1,
      pale: 1,
      deep: 1,
      bright: 1,
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
    // so projects lifts it 1.5x while every other chapter stays at 1.
    expect(CHAPTER_PROFILES.projects.bright).toBe(1.5);
    for (const [name, profile] of Object.entries(CHAPTER_PROFILES)) {
      if (name === "projects") continue;
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
