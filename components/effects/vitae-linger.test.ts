import { describe, expect, it } from "vitest";

import { VITAE_TECH_LINGER_MS } from "./vitae-constants";

describe("Vitae tech linger", () => {
  it("waits at least 400ms before revealing tech tags", () => {
    expect(VITAE_TECH_LINGER_MS).toBeGreaterThanOrEqual(400);
  });
});
