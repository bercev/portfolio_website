import { describe, expect, it } from "vitest";

import { applyTopicPrefix } from "./contact-topics";

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
