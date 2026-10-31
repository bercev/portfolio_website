/**
 * Persistence for the portfolio shell's command history (run-4 iter 3).
 *
 * The shell kept history in memory only, so a reload wiped it — and with
 * it the fish-style autosuggestion's source (iter 46), which reads the
 * newest history entry matching the current prefix. Persisting the list
 * in the visitor's own localStorage makes recall + autosuggestion work
 * across visits, like a real shell's HISTFILE.
 *
 * The storage surface is deliberately narrow (`Pick<Storage, ...>`) so
 * the functions are unit-testable with a fake store and never touch
 * `window` themselves — the real terminal wires `window.localStorage`
 * in, client-side only (Terminal.tsx runs this in an effect). Every
 * failure path (private mode, quota, corrupt JSON) degrades to an empty
 * history, never a throw: a broken store must not break the shell.
 *
 * Stored newest-first, matching the shell's in-memory order (unshift on
 * enter), capped so one long session cannot grow the value unbounded.
 * Two live terminals (flyout + contact section) share the key;
 * last-write-wins is acceptable — a fresh mount always loads the
 * latest saved list.
 */

export const TERMINAL_HISTORY_KEY = "bercev-shell-history";

/** Upper bound on persisted entries (newest-first). */
export const MAX_PERSISTED_HISTORY = 200;

type HistoryStore = Pick<Storage, "getItem" | "setItem"> | null | undefined;

/** Load the persisted history, newest-first. Returns [] on any failure. */
export function loadPersistedHistory(
  storage: HistoryStore,
): string[] {
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(TERMINAL_HISTORY_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    .slice(0, MAX_PERSISTED_HISTORY);
}

/** Persist the history (newest-first, capped). Never throws. */
export function persistHistory(
  storage: HistoryStore,
  entries: readonly string[],
): void {
  if (!storage) return;
  try {
    storage.setItem(
      TERMINAL_HISTORY_KEY,
      JSON.stringify(entries.slice(0, MAX_PERSISTED_HISTORY)),
    );
  } catch {
    // Private mode / quota: the shell keeps working in-memory.
  }
}
