import { describe, expect, it } from "vitest";

import { flowDrawDelay } from "./experience-flow";

describe("flowDrawDelay", () => {
  it("starts just after the row enters view, staggered per row", () => {
    expect(flowDrawDelay(0)).toBe(0.1);
    expect(flowDrawDelay(1)).toBeCloseTo(0.13, 10);
  });
});
