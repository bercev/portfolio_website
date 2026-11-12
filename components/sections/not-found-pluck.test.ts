import { describe, expect, it } from "vitest";

import {
  NOT_FOUND_PLUCK_TEXT,
  NOT_FOUND_PLUCK_TENSION,
} from "./not-found-pluck";
import { PLUCK_TENSION } from "@/lib/plucked-string";

describe("NotFoundPluck", () => {
  it("keeps the heading text verbatim", () => {
    expect(NOT_FOUND_PLUCK_TEXT).toBe("404 — Not found");
  });

  it("rings at the reference tension", () => {
    expect(NOT_FOUND_PLUCK_TENSION).toBe(PLUCK_TENSION);
    expect(NOT_FOUND_PLUCK_TENSION).toBe(1);
  });
});
