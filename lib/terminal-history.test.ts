import { describe, expect, it } from "vitest";

import {
  MAX_PERSISTED_HISTORY,
  TERMINAL_HISTORY_KEY,
  loadPersistedHistory,
  persistHistory,
} from "./terminal-history";

function fakeStore(initial?: Record<string, string>) {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    data,
  };
}

describe("loadPersistedHistory", () => {
  it("returns the stored list newest-first", () => {
    const store = fakeStore({
      [TERMINAL_HISTORY_KEY]: JSON.stringify(["goto skills", "whoami"]),
    });
    expect(loadPersistedHistory(store)).toEqual(["goto skills", "whoami"]);
  });

  it("returns [] for a missing key, bad JSON, or a non-array", () => {
    expect(loadPersistedHistory(fakeStore())).toEqual([]);
    expect(
      loadPersistedHistory(fakeStore({ [TERMINAL_HISTORY_KEY]: "not-json" })),
    ).toEqual([]);
    expect(
      loadPersistedHistory(
        fakeStore({ [TERMINAL_HISTORY_KEY]: JSON.stringify({ a: 1 }) }),
      ),
    ).toEqual([]);
  });

  it("drops non-string and empty entries and caps at the max", () => {
    const stored = [
      ...Array.from({ length: MAX_PERSISTED_HISTORY + 10 }, (_, i) => `cmd${i}`),
      "",
      42 as unknown as string,
    ];
    const store = fakeStore({ [TERMINAL_HISTORY_KEY]: JSON.stringify(stored) });
    const loaded = loadPersistedHistory(store);
    expect(loaded).toHaveLength(MAX_PERSISTED_HISTORY);
    expect(loaded[0]).toBe("cmd0");
    expect(loaded).not.toContain("");
  });

  it("returns [] when storage throws or is null", () => {
    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
    };
    expect(loadPersistedHistory(throwing)).toEqual([]);
    expect(loadPersistedHistory(null)).toEqual([]);
    expect(loadPersistedHistory(undefined)).toEqual([]);
  });
});

describe("persistHistory", () => {
  it("writes the capped list as JSON", () => {
    const store = fakeStore();
    persistHistory(store, ["a", "b"]);
    expect(store.data.get(TERMINAL_HISTORY_KEY)).toBe(
      JSON.stringify(["a", "b"]),
    );
    persistHistory(
      store,
      Array.from({ length: MAX_PERSISTED_HISTORY + 5 }, (_, i) => `c${i}`),
    );
    expect(
      (JSON.parse(store.data.get(TERMINAL_HISTORY_KEY)!) as string[]).length,
    ).toBe(MAX_PERSISTED_HISTORY);
  });

  it("never throws when storage is unavailable or throws", () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => persistHistory(throwing, ["a"])).not.toThrow();
    expect(() => persistHistory(null, ["a"])).not.toThrow();
  });
});
