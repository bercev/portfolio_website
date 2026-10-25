import { describe, expect, it } from "vitest";

import { applyTopicPrefix, resolveTopicParam } from "./contact-topics";

describe("applyTopicPrefix", () => {
  it("fills an empty message with the prefix", () => {
    expect(applyTopicPrefix("", "Topic: Hiring — ")).toBe("Topic: Hiring — ");
  });

  it("prepends the prefix without clobbering typed text", () => {
    expect(applyTopicPrefix("hello there", "Topic: Hiring — ")).toBe(
      "Topic: Hiring — hello there",
    );
  });

  it("swaps an existing topic prefix instead of stacking", () => {
    expect(
      applyTopicPrefix(
        "Topic: Hiring — hello there",
        "Topic: Collaboration — ",
      ),
    ).toBe("Topic: Collaboration — hello there");
  });

  it("tapping the same topic twice is idempotent", () => {
    expect(
      applyTopicPrefix("Topic: Hiring — hello", "Topic: Hiring — "),
    ).toBe("Topic: Hiring — hello");
  });
});

describe("resolveTopicParam", () => {
  it("matches a known label exactly", () => {
    expect(resolveTopicParam("Hiring")?.prefix).toBe("Topic: Hiring — ");
  });

  it("matches case-insensitively and trims whitespace", () => {
    expect(resolveTopicParam("  research question ")?.label).toBe(
      "Research question",
    );
  });

  it("ignores unknown values instead of rendering them", () => {
    expect(resolveTopicParam("Free-form injected text")).toBeNull();
    expect(resolveTopicParam("Topic: Hiring — ")).toBeNull();
  });

  it("returns null for null or empty input", () => {
    expect(resolveTopicParam(null)).toBeNull();
    expect(resolveTopicParam("   ")).toBeNull();
  });
});
