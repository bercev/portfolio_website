import { describe, expect, it } from "vitest";

import {
  EPILOGUE_ARCHIVE,
  EPILOGUE_POP_SPRING,
  epiloguePopDelay,
} from "./journey-epilogue";

describe("epiloguePopDelay", () => {
  it("staggers the sign-off pop, mark → line → stamp", () => {
    expect(epiloguePopDelay(0)).toBe(0.05);
    expect(epiloguePopDelay(1)).toBeCloseTo(0.17, 10);
    expect(epiloguePopDelay(2)).toBeCloseTo(0.29, 10);
  });

  it("staggers the archive strip before the loop-back", () => {
    expect(epiloguePopDelay(3)).toBeCloseTo(0.41, 10);
  });
});

describe("EPILOGUE_ARCHIVE", () => {
  it("lists the lineage, earlier site → current site → this direction", () => {
    expect(EPILOGUE_ARCHIVE).toEqual([
      { name: "Earlier site", status: "Superseded" },
      { name: "Current site", status: "Live" },
      { name: "Light and flow", status: "This edition" },
    ]);
  });

  it("claims no dates and no links — lineage only, nothing invented", () => {
    for (const entry of EPILOGUE_ARCHIVE) {
      expect(`${entry.name} ${entry.status}`).not.toMatch(/\d{4}|http|www\./);
    }
  });
});

describe("EPILOGUE_POP_SPRING", () => {
  it("is underdamped, so the pop visibly overshoots before settling", () => {
    const { stiffness, damping } = EPILOGUE_POP_SPRING;
    expect(damping).toBeLessThan(2 * Math.sqrt(stiffness));
  });
});
