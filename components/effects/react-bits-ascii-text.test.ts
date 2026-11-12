import { describe, expect, it } from "vitest";

import { asciiVisualKey, ASCII_TEXT_FRAGMENT_SHADER } from "./react-bits-ascii-text";

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

// RUN10-LIGHT-BERAT: the fragment shader lifts partial glyph coverage
// toward solid, gated on a dark tint — the mechanism that makes the RM
// light-theme BERAT read on a near-white page. These tests pin the
// mechanism in the shader string: the visual proof is the RM-light
// frames, this is the tripwire against a silent revert.
describe("asciiTextFragmentShader light-BERAT lift", () => {
  const shader = ASCII_TEXT_FRAGMENT_SHADER;

  it("lifts glyph alpha toward solid with a smoothstep", () => {
    expect(shader).toContain("smoothstep(0.0, 0.5, glyphAlpha)");
  });

  it("gates the lift on a dark tint, so bright tints keep their alpha", () => {
    expect(shader).toContain("float tintLuma = dot(tint, vec3(0.3, 0.6, 0.1));");
    expect(shader).toContain("float darkTint = 1.0 - smoothstep(0.15, 0.5, tintLuma);");
    expect(shader).toContain(
      "glyphAlpha = mix(glyphAlpha, smoothstep(0.0, 0.5, glyphAlpha), darkTint);"
    );
  });

  it("computes the tint before the lift and lifts before the color mix", () => {
    const tintAt = shader.indexOf("vec3 tint = mix(");
    const liftAt = shader.indexOf("glyphAlpha = mix(glyphAlpha, smoothstep(0.0, 0.5, glyphAlpha), darkTint);");
    const colorAt = shader.indexOf("vec3 color = mix(under, abs(tint - under), glyphAlpha);");
    expect(tintAt).toBeGreaterThan(-1);
    expect(liftAt).toBeGreaterThan(tintAt);
    expect(colorAt).toBeGreaterThan(liftAt);
  });

  it("leaves the light-inversion branch and the alpha output untouched", () => {
    expect(shader).toContain("if (uLight > 0.5) color = vec3(alpha) - color;");
    expect(shader).toContain("float alpha = max(blockAlpha, glyphAlpha) * uReady;");
  });
});
