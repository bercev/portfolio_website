import { describe, expect, it } from "vitest";

import { PLAIN_PATH, isPlainPath } from "./motion-preference";

describe("isPlainPath", () => {
  it("matches the dedicated no-animation route", () => {
    expect(isPlainPath(PLAIN_PATH)).toBe(true);
    expect(isPlainPath("/")).toBe(false);
    expect(isPlainPath("/plain/")).toBe(false);
  });
});
