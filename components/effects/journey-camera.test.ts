import { describe, expect, it } from "vitest";

import {
  PATH_END_T,
  SECTION_PATH_T,
  journeyLookName,
  mapSectionScrollToJourneyT,
  resolveJourneyLookTarget,
} from "./journey-camera";

const HOME_ABOUT_ANCHORS = [
  { y: 0, t: SECTION_PATH_T[0] },
  { y: 900, t: SECTION_PATH_T[1] },
  { y: 1800, t: SECTION_PATH_T[2] },
  { y: 2700, t: SECTION_PATH_T[3] },
  { y: 3600, t: SECTION_PATH_T[4] },
  { y: 4500, t: SECTION_PATH_T[5] },
  { y: 5400, t: SECTION_PATH_T[6] },
] as const;

describe("mapSectionScrollToJourneyT", () => {
  it("holds t at 0 while the hero is at rest so the camera stays on BERAT", () => {
    const t = mapSectionScrollToJourneyT({
      scrollY: 0,
      viewportH: 900,
      maxScroll: 5400,
      anchors: HOME_ABOUT_ANCHORS,
    });

    expect(t).toBe(0);
  });

  it("starts moving as soon as the user scrolls off the hero", () => {
    const t = mapSectionScrollToJourneyT({
      scrollY: 180,
      viewportH: 900,
      maxScroll: 5400,
      anchors: HOME_ABOUT_ANCHORS,
    });

    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(SECTION_PATH_T[1]);
  });

  it("keeps Experience through Projects traveling", () => {
    const experience = mapSectionScrollToJourneyT({
      scrollY: 2700,
      viewportH: 900,
      maxScroll: 5400,
      anchors: HOME_ABOUT_ANCHORS,
    });
    const projects = mapSectionScrollToJourneyT({
      scrollY: 3600,
      viewportH: 900,
      maxScroll: 5400,
      anchors: HOME_ABOUT_ANCHORS,
    });

    expect(experience).toBeGreaterThan(0.2);
    expect(projects).toBeGreaterThan(experience + 0.02);
    expect(projects).toBeLessThan(0.9);
  });

  it("leaves residual travel from Skills through Contact", () => {
    const skills = mapSectionScrollToJourneyT({
      scrollY: 4500,
      viewportH: 900,
      maxScroll: 5400,
      anchors: HOME_ABOUT_ANCHORS,
    });
    const contact = mapSectionScrollToJourneyT({
      scrollY: 5400,
      viewportH: 900,
      maxScroll: 5400,
      anchors: HOME_ABOUT_ANCHORS,
    });

    expect(skills).toBeGreaterThan(0.5);
    expect(skills).toBeLessThan(0.9);
    expect(contact).toBeGreaterThan(skills);
    expect(contact).toBeLessThan(0.94);
    expect(contact).toBeLessThanOrEqual(PATH_END_T);
  });
});

describe("resolveJourneyLookTarget", () => {
  const textPos = { x: 0, y: 0.4, z: 7 };
  const arrivalPos = { x: 0, y: 0.4, z: -142 };
  const cameraPos = { x: 0, y: 0.4, z: 15 };
  const skewedTangent = { x: 0.35, y: 0.2, z: -0.9 };

  it("looks straight at BERAT at t≈0 instead of down a skewed path tangent", () => {
    const look = resolveJourneyLookTarget({
      t: 0,
      cameraPos,
      tangent: skewedTangent,
      textPos,
      arrivalPos,
    });

    expect(look.x).toBeCloseTo(textPos.x, 1);
    expect(look.y).toBeCloseTo(textPos.y, 1);
    expect(look.z).toBeCloseTo(textPos.z, 1);
    expect(journeyLookName({ look, textPos, arrivalPos })).toBe("berat");
  });

  it("frames a nearby sculpture along the path instead of an empty canyon", () => {
    const stationPos = { x: 11, y: 2, z: -28 };
    const look = resolveJourneyLookTarget({
      t: 0.5,
      cameraPos: { x: 3, y: 1, z: -20 },
      tangent: { x: 0, y: 0, z: -1 },
      textPos,
      arrivalPos,
      stationPos,
    });

    expect(look.x).toBeGreaterThan(4);
    expect(look.z).toBeLessThan(-20);
    expect(journeyLookName({ look, textPos, arrivalPos })).toBe("path");
  });

  it("keeps the look more path-centered when stationWeight is reduced for phones", () => {
    const stationPos = { x: 11, y: 2, z: -28 };
    const desktop = resolveJourneyLookTarget({
      t: 0.5,
      cameraPos: { x: 3, y: 1, z: -20 },
      tangent: { x: 0, y: 0, z: -1 },
      textPos,
      arrivalPos,
      stationPos,
      stationWeight: 0.28,
    });
    const phone = resolveJourneyLookTarget({
      t: 0.5,
      cameraPos: { x: 3, y: 1, z: -20 },
      tangent: { x: 0, y: 0, z: -1 },
      textPos,
      arrivalPos,
      stationPos,
      stationWeight: 0.1,
    });

    expect(Math.abs(phone.x - 3)).toBeLessThan(Math.abs(desktop.x - 3));
  });

  it("aims toward CONNECT near the end of the path", () => {
    const look = resolveJourneyLookTarget({
      t: PATH_END_T,
      cameraPos: { x: 0, y: 0, z: -120 },
      tangent: { x: 0, y: 0, z: -1 },
      textPos,
      arrivalPos,
    });

    expect(look.z).toBeLessThan(-130);
    expect(journeyLookName({ look, textPos, arrivalPos })).toBe("connect");
  });
});
