import { describe, expect, it } from "vitest";

import {
  FILE_PLATE_DELAY_MS,
  FILE_PLATE_SLIDE_MS,
  FILE_PLATE_SLIDE_Y,
  FILE_SHEET_EASE,
  FILE_SHEET_RISE_MS,
  FILE_SHEET_RISE_Y,
  FILE_SHEET_SCALE,
  FILE_STAMP_DELAY_MS,
  FILE_STAMP_PRESS_MS,
  fileSheetFormEnter,
  fileSheetFormExit,
  fileSheetReceiptEnter,
  fileSheetScrollTarget,
  fileSheetStampTransition,
} from "./contact-file-sheet";

describe("contact file-sheet timings", () => {
  it("files the form up and away in ~400ms", () => {
    expect(FILE_SHEET_RISE_MS).toBe(400);
    expect(FILE_SHEET_RISE_Y).toBe(-24);
    expect(FILE_SHEET_SCALE).toBe(0.96);
  });

  it("slides the completion plate up in ~300ms after a 100ms delay", () => {
    expect(FILE_PLATE_SLIDE_MS).toBe(300);
    expect(FILE_PLATE_SLIDE_Y).toBe(32);
    expect(FILE_PLATE_DELAY_MS).toBe(100);
  });

  it("presses the stamp as the plate settles", () => {
    expect(FILE_STAMP_DELAY_MS).toBe(350);
    expect(FILE_STAMP_PRESS_MS).toBe(220);
  });

  it("uses the site ease-out everywhere", () => {
    expect([...FILE_SHEET_EASE]).toEqual([0.16, 1, 0.3, 1]);
  });
});

describe("fileSheetFormExit", () => {
  it("rises, scales down, fades and collapses its height", () => {
    const exit = fileSheetFormExit(false);
    expect(exit).toMatchObject({
      opacity: 0,
      y: -24,
      scale: 0.96,
      height: 0,
      overflow: "hidden",
    });
    expect(exit.transition?.duration).toBeCloseTo(0.4);
  });

  it("is instant under reduced motion", () => {
    const exit = fileSheetFormExit(true);
    expect(exit.opacity).toBe(0);
    expect(exit.y).toBeUndefined();
    expect(exit.transition?.duration).toBe(0);
  });
});

describe("fileSheetFormEnter", () => {
  it("returns the form from below on 'send another'", () => {
    const enter = fileSheetFormEnter(false);
    expect(enter.initial).toMatchObject({ opacity: 0, y: 32 });
    expect(enter.animate).toMatchObject({ opacity: 1, y: 0 });
  });

  it("is instant under reduced motion", () => {
    const enter = fileSheetFormEnter(true);
    expect(enter.initial).toMatchObject({ opacity: 1, y: 0 });
    expect(enter.transition.duration).toBe(0);
  });
});

describe("fileSheetReceiptEnter", () => {
  it("slides the plate up from below with a delay", () => {
    const enter = fileSheetReceiptEnter(false);
    expect(enter.initial).toMatchObject({ opacity: 0, y: 32 });
    expect(enter.animate).toMatchObject({ opacity: 1, y: 0 });
    expect(enter.transition.delay).toBeCloseTo(0.1);
    expect(enter.transition.duration).toBeCloseTo(0.3);
  });

  it("renders settled under reduced motion", () => {
    const enter = fileSheetReceiptEnter(true);
    expect(enter.initial).toMatchObject({ opacity: 1, y: 0 });
    expect(enter.transition.duration).toBe(0);
  });
});

describe("fileSheetStampTransition", () => {
  it("presses in 220ms after a 350ms delay", () => {
    const t = fileSheetStampTransition(false);
    expect(t.duration).toBeCloseTo(0.22);
    expect(t.delay).toBeCloseTo(0.35);
  });

  it("is instant under reduced motion", () => {
    expect(fileSheetStampTransition(true).duration).toBe(0);
  });
});

describe("fileSheetScrollTarget", () => {
  it("lands the filing container 60px below the viewport top", () => {
    expect(fileSheetScrollTarget(700, 500)).toBe(1140);
    expect(fileSheetScrollTarget(20, 0)).toBe(0);
  });

  it("never scrolls above the page top", () => {
    expect(fileSheetScrollTarget(-100, 0)).toBe(0);
  });
});
