import { describe, expect, it } from "vitest";

import {
  SKILL_RING_CAP_R,
  SKILL_RING_DIMMED_LABEL_OPACITY,
  SKILL_RING_DIMMED_OPACITY,
  SKILL_RING_DRAW_S,
  SKILL_RING_LAP_OVER,
  SKILL_RING_OVER_S,
  SKILL_RING_STROKE,
  skillRingBaseOffset,
  skillRingCircumference,
  skillRingCountAt,
  skillRingDimmed,
  skillRingDrawSeconds,
  skillRingGroupForSkill,
  skillRingLapOffset,
  skillRingLapRest,
  skillRingRatio,
} from "./skill-rings";

const C = skillRingCircumference();

describe("skillRingRatio", () => {
  it("laps past the goal for a group with skills", () => {
    expect(skillRingRatio(7)).toBe(1 + SKILL_RING_LAP_OVER);
    expect(skillRingRatio(2)).toBe(1 + SKILL_RING_LAP_OVER);
  });

  it("draws nothing for an empty group", () => {
    expect(skillRingRatio(0)).toBe(0);
  });
});

describe("skillRingDrawSeconds", () => {
  it("is the first lap plus the lap-over share of the over time", () => {
    expect(skillRingDrawSeconds(1 + SKILL_RING_LAP_OVER)).toBeCloseTo(
      SKILL_RING_DRAW_S + SKILL_RING_OVER_S * SKILL_RING_LAP_OVER,
      10,
    );
  });

  it("is exactly the first lap at ratio 1", () => {
    expect(skillRingDrawSeconds(1)).toBe(SKILL_RING_DRAW_S);
  });
});

describe("skillRingBaseOffset", () => {
  it("starts fully hidden and ends fully drawn", () => {
    expect(skillRingBaseOffset(0, C)).toBeCloseTo(C, 10);
    expect(skillRingBaseOffset(1, C)).toBeCloseTo(0, 10);
    expect(skillRingBaseOffset(1.12, C)).toBeCloseTo(0, 10);
  });

  it("is half drawn halfway through the first lap", () => {
    expect(skillRingBaseOffset(0.5, C)).toBeCloseTo(C / 2, 10);
  });
});

describe("skillRingLapRest / skillRingLapOffset", () => {
  it("has no overflow lap before the goal", () => {
    expect(skillRingLapRest(0.5)).toBe(0);
    expect(skillRingLapRest(1)).toBe(0);
    expect(skillRingLapOffset(1, C)).toBeCloseTo(C, 10);
  });

  it("draws the lap-over past the seam", () => {
    expect(skillRingLapRest(1 + SKILL_RING_LAP_OVER)).toBeCloseTo(
      SKILL_RING_LAP_OVER,
      10,
    );
    expect(skillRingLapOffset(1 + SKILL_RING_LAP_OVER, C)).toBeCloseTo(
      (1 - SKILL_RING_LAP_OVER) * C,
      10,
    );
  });

  it("reads a whole number of laps as a full lap", () => {
    expect(skillRingLapRest(2)).toBe(1);
    expect(skillRingLapOffset(2, C)).toBeCloseTo(0, 10);
  });
});

describe("skillRingCountAt", () => {
  it("counts 0 at the start and lands exactly on the real value", () => {
    const ratio = 1 + SKILL_RING_LAP_OVER;
    expect(skillRingCountAt(0, ratio, 7)).toBe(0);
    expect(skillRingCountAt(ratio, ratio, 7)).toBe(7);
    expect(skillRingCountAt(ratio + 0.1, ratio, 7)).toBe(7);
  });

  it("counts in step with the ring", () => {
    const ratio = 1 + SKILL_RING_LAP_OVER;
    // Halfway through the draw (p = ratio / 2) the count is half the group.
    expect(skillRingCountAt(ratio / 2, ratio, 7)).toBe(4);
    expect(skillRingCountAt(ratio / 2, ratio, 2)).toBe(1);
  });

  it("stays 0 when there is nothing to count", () => {
    expect(skillRingCountAt(1, 0, 0)).toBe(0);
  });
});

describe("skillRingGroupForSkill", () => {
  const groups = [
    { items: [{ name: "Python" }, { name: "LLMs" }] },
    { items: [{ name: "TypeScript" }] },
  ];

  it("finds the group holding the skill", () => {
    expect(skillRingGroupForSkill(groups, "Python")).toBe(0);
    expect(skillRingGroupForSkill(groups, "TypeScript")).toBe(1);
  });

  it("returns null for no skill or an unknown name", () => {
    expect(skillRingGroupForSkill(groups, null)).toBeNull();
    expect(skillRingGroupForSkill(groups, "Cobol")).toBeNull();
  });
});

describe("skillRingDimmed", () => {
  it("dims every ring but the focused one", () => {
    expect(skillRingDimmed(null, 1, 0)).toBe(true);
    expect(skillRingDimmed(null, 1, 1)).toBe(false);
    expect(skillRingDimmed(null, 1, 2)).toBe(true);
  });

  it("dims every ring but the active-skill group", () => {
    expect(skillRingDimmed(0, null, 0)).toBe(false);
    expect(skillRingDimmed(0, null, 3)).toBe(true);
  });

  it("dims nothing when nothing holds the focus", () => {
    expect(skillRingDimmed(null, null, 0)).toBe(false);
    expect(skillRingDimmed(null, null, 3)).toBe(false);
  });

  it("keeps the dim values in the reference's range", () => {
    expect(SKILL_RING_DIMMED_OPACITY).toBe(0.25);
    expect(SKILL_RING_DIMMED_LABEL_OPACITY).toBe(0.4);
  });

  it("sizes the lap cap as a bead that clears the stroke", () => {
    // Round-1 critics: an r=5 cap sits entirely inside the 10px stroke
    // and is invisible in the settled state. The bead must protrude.
    expect(SKILL_RING_CAP_R).toBeGreaterThan(SKILL_RING_STROKE / 2);
    expect(SKILL_RING_CAP_R).toBe(SKILL_RING_STROKE / 2 + 3);
  });
});
