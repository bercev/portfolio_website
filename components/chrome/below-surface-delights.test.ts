import { describe, expect, it } from "vitest";

import { VIEW_SOURCE_COMMENT } from "./below-surface-delights";

describe("below-surface delights", () => {
  it("the view-source comment is a single well-formed HTML comment", () => {
    expect(VIEW_SOURCE_COMMENT.startsWith("<!--")).toBe(true);
    expect(VIEW_SOURCE_COMMENT.endsWith("-->")).toBe(true);
    const inner = VIEW_SOURCE_COMMENT.slice(4, -3);
    // "--" inside a comment would terminate it early and corrupt the markup
    expect(inner).not.toContain("--");
    expect(inner).not.toContain("<!--");
  });

  it("reuses the beratfetch block-letter BERAT mark verbatim", () => {
    expect(VIEW_SOURCE_COMMENT).toContain("████  █████ ████    █   █████");
    expect(VIEW_SOURCE_COMMENT).toContain("████  █████ █  █  █   █   █  ");
  });
});
