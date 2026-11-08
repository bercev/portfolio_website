import { describe, expect, it } from "vitest";

import {
  BLUEPRINT_PROFILES,
  getBlueprintProfile,
  lerpBlueprintProfile,
} from "./blueprint-field";

describe("getBlueprintProfile", () => {
  it("returns the hero profile for unknown and null chapters", () => {
    expect(getBlueprintProfile(null)).toEqual(BLUEPRINT_PROFILES.hero);
    expect(getBlueprintProfile("nope")).toEqual(BLUEPRINT_PROFILES.hero);
  });

  it("returns the named chapter profile", () => {
    expect(getBlueprintProfile("projects")).toEqual(
      BLUEPRINT_PROFILES.projects,
    );
    expect(BLUEPRINT_PROFILES.projects.angle).toBe(5);
  });
});

describe("lerpBlueprintProfile", () => {
  it("interpolates every field at the midpoint", () => {
    const mid = lerpBlueprintProfile(
      BLUEPRINT_PROFILES.hero,
      BLUEPRINT_PROFILES.projects,
      0.5,
    );
    expect(mid.angle).toBeCloseTo(2.5);
    expect(mid.cell).toBeCloseTo(24);
    expect(mid.veil).toBeCloseTo(0.22);
    expect(mid.dotRadius).toBeCloseTo(1.7);
  });

  it("is exact at the endpoints", () => {
    expect(
      lerpBlueprintProfile(
        BLUEPRINT_PROFILES.about,
        BLUEPRINT_PROFILES.skills,
        0,
      ),
    ).toEqual(BLUEPRINT_PROFILES.about);
    expect(
      lerpBlueprintProfile(
        BLUEPRINT_PROFILES.about,
        BLUEPRINT_PROFILES.skills,
        1,
      ),
    ).toEqual(BLUEPRINT_PROFILES.skills);
  });
});
