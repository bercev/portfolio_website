import { describe, expect, it } from "vitest";

import { asciiVisualKey } from "./react-bits-ascii-text";

// Locks the wake trigger's membership (run-8 iter 31, RUN8-PLAIN-BERAT-STALE):
// the ASCIIText rAF loop sleeps when idle, so a change to the shader's
// visual settings must wake it — the key must move exactly when theme or
// palette moves, and stay put otherwise.
describe("asciiVisualKey", () => {
  const cyan = ["#ffffff", "#00e5ff", "#0090ff"];
  const navy = ["#000d17", "#001320", "#001a2b"];

  it("is stable for identical visual settings", () => {
    expect(asciiVisualKey("dark", cyan)).toBe(asciiVisualKey("dark", [...cyan]));
  });

  it("changes when the palette changes", () => {
    expect(asciiVisualKey("dark", cyan)).not.toBe(asciiVisualKey("dark", navy));
  });

  it("changes when the theme changes", () => {
    expect(asciiVisualKey("dark", cyan)).not.toBe(asciiVisualKey("light", cyan));
  });
});
