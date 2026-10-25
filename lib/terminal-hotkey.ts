/** Backquote hotkey for the terminal flyout (run-3 iter 13).
 *
 * Pressing ` opens the terminal flyout when it is closed — the
 * terminal-native affordance for a shell surface (every real terminal app
 * has a hotkey). The predicate is pure so the guard rules are unit-tested
 * rather than trusted to a probe:
 *
 * - never fires while the flyout is already open: once open, the key
 *   belongs to the live shell, and stealing it would break typing backquote
 *   into the terminal itself.
 * - never fires while focus sits in an editable element (contact inputs,
 *   xterm textarea, contenteditable): a hotkey that hijacks typing is
 *   worse than none.
 * - never fires with a modifier held: Cmd+` is the OS window switch on
 *   macOS, Ctrl+`/Alt+` belong to the browser/OS — untouched.
 * - matches by physical code OR produced character: `code === "Backquote"`
 *   covers layout-independent keyboards, `key === "`"` covers layouts
 *   where the key produces a backquote under a different code.
 *
 * WCAG 2.1.4 note (single-character shortcuts): this shortcut is global
 * and cannot be remapped, which the criterion disfavors — the mitigations
 * are that it fires only outside editable targets (never while typing),
 * it claims no browser/OS binding (bare backquote has none), and the
 * trigger itself stays fully Tab-reachable, so the hotkey is an
 * accelerator, never the only path. Escape closes the flyout and returns
 * focus to the trigger.
 */

export type TerminalHotkeyEvent = {
  readonly code: string;
  readonly key: string;
  /** Flyout already open — the key belongs to the live shell then. */
  readonly open: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  /** Focus sits inside an input, textarea, or contenteditable. */
  readonly targetIsEditable: boolean;
};

export function shouldOpenTerminalOnBackquote(
  event: TerminalHotkeyEvent,
): boolean {
  if (event.open) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.targetIsEditable) return false;
  return event.code === "Backquote" || event.key === "`";
}
