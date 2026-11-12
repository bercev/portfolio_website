import { describe, expect, it } from "vitest";

import {
  BOOT_BREATHE_MS,
  BOOT_DURATION_MS,
  BOOT_FADE_MS,
  BOOT_RING_CLEARANCE_PX,
  BOOT_RING_LABEL,
  BOOT_RING_SIZE_NARROW_PX,
  BOOT_RING_SIZE_PX,
  BOOT_RING_SPIN_MS,
  BOOT_UNMOUNT_MS,
  bootBreatheAt,
  bootOverlayVisible,
  bootRingAngleAt,
  bootRingFitsViewport,
} from "./boot-ring";

describe("bootRingAngleAt", () => {
  it("starts at 0 and completes one turn per spin period", () => {
    expect(bootRingAngleAt(0)).toBe(0);
    expect(bootRingAngleAt(BOOT_RING_SPIN_MS / 4)).toBe(90);
    expect(bootRingAngleAt(BOOT_RING_SPIN_MS / 2)).toBe(180);
    expect(bootRingAngleAt(BOOT_RING_SPIN_MS)).toBe(0);
    expect(bootRingAngleAt(BOOT_RING_SPIN_MS * 2 + 350)).toBe(90);
  });

  it("never goes negative for negative ages", () => {
    expect(bootRingAngleAt(-350)).toBe(270);
  });

  it("turns ~1.86 times inside the auto-dismiss window", () => {
    // Any two frames ~700ms apart show the bright arc on opposite
    // sides — the rotation is unmissable in a frame pair.
    expect(BOOT_DURATION_MS / BOOT_RING_SPIN_MS).toBeGreaterThan(1.5);
    expect(
      Math.abs(bootRingAngleAt(700) - bootRingAngleAt(0)),
    ).toBeCloseTo(180, 0);
  });
});

describe("bootBreatheAt", () => {
  it("breathes on the spin period, never below the floor", () => {
    expect(bootBreatheAt(0)).toBeCloseTo(0.55, 2);
    expect(bootBreatheAt(BOOT_BREATHE_MS / 4)).toBeCloseTo(1, 2);
    expect(bootBreatheAt(BOOT_BREATHE_MS / 2)).toBeCloseTo(0.55, 2);
    expect(bootBreatheAt((BOOT_BREATHE_MS * 3) / 4)).toBeCloseTo(0.1, 2);
    for (let t = 0; t < BOOT_BREATHE_MS; t += 50) {
      expect(bootBreatheAt(t)).toBeGreaterThanOrEqual(0.1);
      expect(bootBreatheAt(t)).toBeLessThanOrEqual(1);
    }
  });
});

describe("boot overlay timing", () => {
  it("auto-dismisses at 2.6s and unmounts 450ms later", () => {
    expect(BOOT_DURATION_MS).toBe(2600);
    expect(BOOT_FADE_MS).toBe(450);
    expect(BOOT_UNMOUNT_MS).toBe(3050);
    expect(bootOverlayVisible(0)).toBe(true);
    expect(bootOverlayVisible(BOOT_UNMOUNT_MS - 1)).toBe(true);
    expect(bootOverlayVisible(BOOT_UNMOUNT_MS)).toBe(false);
  });
});

describe("bootRingFitsViewport", () => {
  it("fits the 390px viewport with clearance on both sides", () => {
    expect(
      bootRingFitsViewport(BOOT_RING_SIZE_NARROW_PX, 390),
    ).toBe(true);
    expect(
      BOOT_RING_SIZE_NARROW_PX + BOOT_RING_CLEARANCE_PX * 2,
    ).toBeLessThanOrEqual(390);
  });

  it("fits the desktop size at 1440px", () => {
    expect(bootRingFitsViewport(BOOT_RING_SIZE_PX, 1440)).toBe(true);
  });

  it("rejects a ring wider than the viewport", () => {
    expect(bootRingFitsViewport(400, 390)).toBe(false);
  });

  it("pins the sizes the CSS mirrors", () => {
    expect(BOOT_RING_SIZE_PX).toBe(120);
    expect(BOOT_RING_SIZE_NARROW_PX).toBe(96);
    expect(BOOT_RING_LABEL).toBe("gathering light");
  });
});
