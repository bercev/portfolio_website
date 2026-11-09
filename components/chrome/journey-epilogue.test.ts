import { describe, expect, it } from "vitest";

import { EPILOGUE_POP_SPRING, epiloguePopDelay } from "./journey-epilogue";

describe("epiloguePopDelay", () => {
  it("staggers the sign-off pop, mark → line → stamp", () => {
    expect(epiloguePopDelay(0)).toBe(0.05);
    expect(epiloguePopDelay(1)).toBeCloseTo(0.17, 10);
    expect(epiloguePopDelay(2)).toBeCloseTo(0.29, 10);
  });
});

describe("EPILOGUE_POP_SPRING", () => {
  it("is underdamped, so the pop visibly overshoots before settling", () => {
    const { stiffness, damping } = EPILOGUE_POP_SPRING;
    expect(damping).toBeLessThan(2 * Math.sqrt(stiffness));
  });
});
