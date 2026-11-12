import { describe, expect, it } from "vitest";

import {
  LASER_BEAM_X,
  LASER_INTRO_DELAY_MS,
  LASER_INTRO_DROP_MS,
  LASER_INTRO_END_MS,
  LASER_POUR_RATE,
  LASER_SETTLED_BEAM_PX,
  LASER_SPILL_PX,
  LASER_SPLASH_MS,
  laserBeamFrontY,
  laserBeamTopY,
  laserBloom,
  laserBreath,
  laserHoverBoost,
  laserPhase,
  laserPourFill,
  laserPourFront,
  laserPourTau,
  laserSettled,
  laserSpill,
  laserSplash,
  laserSpring,
  laserTauSeconds,
} from "./hero-laser";

describe("laserPhase", () => {
  it("waits through the intro delay", () => {
    expect(laserPhase(0)).toBe("waiting");
    expect(laserPhase(LASER_INTRO_DELAY_MS - 1)).toBe("waiting");
  });

  it("falls for the drop duration, then pours, then settles", () => {
    expect(laserPhase(LASER_INTRO_DELAY_MS)).toBe("fall");
    expect(
      laserPhase(LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS - 1),
    ).toBe("fall");
    expect(
      laserPhase(LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS),
    ).toBe("pour");
    expect(laserPhase(LASER_INTRO_END_MS - 1)).toBe("pour");
    expect(laserPhase(LASER_INTRO_END_MS)).toBe("settled");
    expect(laserPhase(LASER_INTRO_END_MS + 10000)).toBe("settled");
  });

  it("settles only at/after INTRO_END", () => {
    expect(laserSettled(LASER_INTRO_END_MS - 1)).toBe(false);
    expect(laserSettled(LASER_INTRO_END_MS)).toBe(true);
  });
});

describe("laserBeamFrontY", () => {
  const pillTop = 112;

  it("parks at the canvas top before the delay", () => {
    expect(laserBeamFrontY(0, pillTop)).toBe(0);
    expect(laserBeamFrontY(LASER_INTRO_DELAY_MS - 1, pillTop)).toBe(0);
  });

  it("rests on the pill top after impact", () => {
    expect(
      laserBeamFrontY(LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS, pillTop),
    ).toBe(pillTop);
    expect(laserBeamFrontY(LASER_INTRO_END_MS, pillTop)).toBe(pillTop);
  });

  it("is mid-fall halfway through the drop (reference ^1.3 curve)", () => {
    const mid = LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS / 2;
    expect(laserBeamFrontY(mid, pillTop)).toBeCloseTo(
      pillTop * Math.pow(0.5, 1.3),
      10,
    );
    expect(laserBeamFrontY(mid, pillTop)).toBeGreaterThan(0);
    expect(laserBeamFrontY(mid, pillTop)).toBeLessThan(pillTop);
  });
});

describe("laserBeamTopY (drain)", () => {
  const pillTop = 112;

  it("spans the whole drop during the fall", () => {
    expect(
      laserBeamTopY(LASER_INTRO_DELAY_MS + 100, pillTop),
    ).toBe(0);
  });

  it("drains to the settled stub by one second after impact", () => {
    const t = LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS + 1000;
    expect(laserBeamTopY(t, pillTop)).toBeCloseTo(
      pillTop - LASER_SETTLED_BEAM_PX,
      10,
    );
  });

  it("holds the stub once settled", () => {
    expect(laserBeamTopY(LASER_INTRO_END_MS + 5000, pillTop)).toBeCloseTo(
      pillTop - LASER_SETTLED_BEAM_PX,
      10,
    );
  });
});

describe("laserSpring / laserBloom", () => {
  it("is 0 before impact and 1 once settled", () => {
    expect(laserSpring(0)).toBe(0);
    expect(laserSpring(-1)).toBe(0);
    expect(laserBloom(0)).toBe(0);
    expect(laserBloom(LASER_INTRO_END_MS)).toBe(1);
  });

  it("overshoots above 1 at the first spring peak (damped harmonic, reference shape)", () => {
    // Spring(omega 8, zeta 0.62) first peaks above 1 at tau = pi/damped ≈ 0.5s.
    const peak = laserSpring(0.5);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.2);
  });

  it("bloom rises after impact", () => {
    const t = LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS + 500;
    const b = laserBloom(t);
    expect(b).toBeGreaterThan(0.5);
    expect(b).toBeLessThan(1.2);
  });
});

describe("laserPourFront / laserPourFill / laserSpill", () => {
  const reach = 100;

  it("is 0 before impact", () => {
    expect(laserPourFront(0, reach)).toBe(0);
    expect(laserPourFill(0, reach)).toBe(0);
    expect(laserSpill(0, reach)).toBe(0);
  });

  it("travels exponentially (reference run-front) and eases into the corner", () => {
    const tau = 1;
    const t = LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS + tau * 1000;
    expect(laserPourFront(t, reach)).toBeCloseTo(
      reach * (1 - Math.exp(-LASER_POUR_RATE * tau)),
      10,
    );
    // Asymptotic: at the settle instant the front is ~95% there, and it
    // keeps closing on the corner smoothly afterwards — no clamp, no pop.
    const atSettle = laserPourFront(LASER_INTRO_END_MS, reach);
    expect(atSettle).toBeGreaterThan(0.9 * reach);
    expect(atSettle).toBeLessThan(reach);
    expect(laserPourFront(LASER_INTRO_END_MS + 10000, reach)).toBeCloseTo(
      reach,
      2,
    );
  });

  it("fill stays 0 until the front is 85% there, then rises smoothly", () => {
    const before = LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS + 1500;
    expect(laserPourFill(before, reach)).toBe(0);
    const atSettle = laserPourFill(LASER_INTRO_END_MS, reach);
    expect(atSettle).toBeGreaterThan(0.6);
    expect(atSettle).toBeLessThan(0.9);
    expect(laserPourFill(LASER_INTRO_END_MS + 10000, reach)).toBeCloseTo(
      1,
      2,
    );
  });

  it("spill grows with the fill, full length only long after settle", () => {
    expect(laserSpill(LASER_INTRO_END_MS, reach)).toBeGreaterThan(15);
    expect(laserSpill(LASER_INTRO_END_MS, reach)).toBeLessThan(
      LASER_SPILL_PX,
    );
    const before = LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS + 1500;
    expect(laserSpill(before, reach)).toBe(0);
    expect(laserSpill(LASER_INTRO_END_MS + 10000, reach)).toBeCloseTo(
      LASER_SPILL_PX,
      1,
    );
  });
});

describe("laserSplash", () => {
  it("is 0 before impact and after its lifetime", () => {
    expect(laserSplash(0)).toBe(0);
    const after =
      LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS + LASER_SPLASH_MS + 1;
    expect(laserSplash(after)).toBe(0);
  });

  it("is full at impact and fades linearly", () => {
    const at = LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS;
    expect(laserSplash(at)).toBeCloseTo(1, 10);
    expect(laserSplash(at + LASER_SPLASH_MS / 2)).toBeCloseTo(0.5, 10);
  });
});

describe("laserBreath", () => {
  it("oscillates 0..1 over the breathe cycle", () => {
    expect(laserBreath(0)).toBeCloseTo(0.5, 10);
    expect(laserBreath(800)).toBeCloseTo(1, 10);
    expect(laserBreath(2400)).toBeCloseTo(0, 10);
  });
});

describe("laserHoverBoost", () => {
  it("is 0 before a hover and decays after one", () => {
    expect(laserHoverBoost(0)).toBe(0);
    expect(laserHoverBoost(-1)).toBe(0);
    expect(laserHoverBoost(0.1)).toBeGreaterThan(0.5);
    expect(laserHoverBoost(2)).toBeLessThan(0.01);
  });
});

describe("laserPourTau (hover restart)", () => {
  it("uses the intro clock when no hover fired", () => {
    expect(laserPourTau(1.5, null)).toBe(1.5);
  });

  it("a fresh hover pour wins over a settled intro clock", () => {
    expect(laserPourTau(99, 0.5)).toBe(0.5);
  });

  it("hands back to the intro clock once the hover pour has settled", () => {
    expect(laserPourTau(99, 99)).toBe(99);
  });
});

describe("laserTauSeconds", () => {
  it("is 0 before impact", () => {
    expect(laserTauSeconds(0)).toBe(0);
    expect(
      laserTauSeconds(LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS - 1),
    ).toBe(0);
  });

  it("counts seconds after impact", () => {
    expect(
      laserTauSeconds(LASER_INTRO_DELAY_MS + LASER_INTRO_DROP_MS + 1500),
    ).toBeCloseTo(1.5, 10);
  });
});

describe("LASER_BEAM_X", () => {
  it("matches the reference default beam position", () => {
    expect(LASER_BEAM_X).toBe(0.6);
  });
});
