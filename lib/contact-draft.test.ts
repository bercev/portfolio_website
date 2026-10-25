import { describe, expect, it } from "vitest";

import {
  CONTACT_DRAFT_MAX_SERIALIZED,
  contactDraftAction,
  parseContactDraft,
} from "./contact-draft";

describe("parseContactDraft", () => {
  it("round-trips a normal draft", () => {
    const draft = { name: "Ada", email: "ada@example.com", message: "hello there" };
    expect(parseContactDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it("rejects malformed JSON", () => {
    expect(parseContactDraft("{not json")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(parseContactDraft(null)).toBeNull();
    expect(parseContactDraft(42)).toBeNull();
  });

  it("rejects mistyped fields", () => {
    expect(
      parseContactDraft(JSON.stringify({ name: "Ada", email: 7, message: "hi" })),
    ).toBeNull();
    expect(parseContactDraft(JSON.stringify({ name: "Ada" }))).toBeNull();
  });

  it("rejects an over-long field", () => {
    expect(
      parseContactDraft(
        JSON.stringify({ name: "x".repeat(81), email: "", message: "" }),
      ),
    ).toBeNull();
  });

  it("rejects an all-empty draft (nothing to restore)", () => {
    expect(
      parseContactDraft(JSON.stringify({ name: "", email: "", message: "" })),
    ).toBeNull();
  });

  it("accepts a partially filled draft", () => {
    expect(
      parseContactDraft(JSON.stringify({ name: "", email: "", message: "hi" })),
    ).toEqual({ name: "", email: "", message: "hi" });
  });
});

describe("contactDraftAction", () => {
  it("clears on all-empty fields", () => {
    expect(
      contactDraftAction({ name: "", email: "", message: "" }),
    ).toEqual({ action: "clear" });
  });

  it("writes a normal draft", () => {
    const result = contactDraftAction({
      name: "Ada",
      email: "ada@example.com",
      message: "hello there",
    });
    expect(result.action).toBe("write");
    if (result.action === "write") {
      expect(parseContactDraft(result.value)).toEqual({
        name: "Ada",
        email: "ada@example.com",
        message: "hello there",
      });
    }
  });

  it("skips an oversized draft instead of persisting it", () => {
    // A 2000-char message plus a long name/email still fits under the
    // ceiling, so oversize needs a programmatically built over-long field;
    // the action must refuse it rather than write it.
    const oversized = "x".repeat(CONTACT_DRAFT_MAX_SERIALIZED);
    expect(
      contactDraftAction({ name: oversized, email: "", message: "" }),
    ).toEqual({ action: "skip" });
  });
});
