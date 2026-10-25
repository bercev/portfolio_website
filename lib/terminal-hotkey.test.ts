import { describe, expect, it } from "vitest";

import {
  shouldOpenTerminalOnBackquote,
  type TerminalHotkeyEvent,
} from "./terminal-hotkey";

const base: TerminalHotkeyEvent = {
  code: "Backquote",
  key: "`",
  open: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  targetIsEditable: false,
};

describe("shouldOpenTerminalOnBackquote", () => {
  it("opens on a plain backquote press while closed", () => {
    expect(shouldOpenTerminalOnBackquote(base)).toBe(true);
  });

  it("opens on the produced character even under a different code", () => {
    expect(
      shouldOpenTerminalOnBackquote({ ...base, code: "Other" }),
    ).toBe(true);
  });

  it("opens on the physical code even if the layout yields another key", () => {
    expect(
      shouldOpenTerminalOnBackquote({ ...base, key: "Dead" }),
    ).toBe(true);
  });

  it("never steals the key from the live terminal once open", () => {
    expect(shouldOpenTerminalOnBackquote({ ...base, open: true })).toBe(
      false,
    );
  });

  it("never hijacks typing in an editable target", () => {
    expect(
      shouldOpenTerminalOnBackquote({ ...base, targetIsEditable: true }),
    ).toBe(false);
  });

  it("leaves modifier combinations to the OS and browser", () => {
    expect(shouldOpenTerminalOnBackquote({ ...base, metaKey: true })).toBe(
      false,
    );
    expect(shouldOpenTerminalOnBackquote({ ...base, ctrlKey: true })).toBe(
      false,
    );
    expect(shouldOpenTerminalOnBackquote({ ...base, altKey: true })).toBe(
      false,
    );
  });

  it("ignores unrelated keys", () => {
    expect(
      shouldOpenTerminalOnBackquote({ ...base, code: "KeyT", key: "t" }),
    ).toBe(false);
  });
});
