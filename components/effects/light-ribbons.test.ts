import { describe, expect, it } from "vitest";

import {
  CHAPTER_PROFILES,
  getChapterProfile,
  lerpChapterProfile,
  resolveActiveChapter,
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
