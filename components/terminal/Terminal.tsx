"use client";

import { useEffect, useRef } from "react";

import { dispatchSkillHighlight } from "@/lib/skill-work";
import { isThemePalette } from "@/lib/theme-palette";

import { usePalette } from "@/components/providers/palette-provider";

import { Shell } from "./shell";
import {
  loadPersistedHistory,
  persistHistory,
} from "@/lib/terminal-history";

/**
 * Portfolio terminal — a real working shell (xterm.js) themed phosphor.
 * Mounts client-side only; the shell itself is framework-free.
 */

const PHOSPHOR_THEME = {
  background: "#05070c",
  foreground: "#c9e8f7",
  cursor: "#7dd3fc",
  cursorAccent: "#05070c",
  selectionBackground: "rgba(125, 211, 252, 0.25)",
  black: "#05070c",
  red: "#f0888f",
  green: "#5ec9a7",
  yellow: "#7dd3fc",
  blue: "#7dd3fc",
  magenta: "#a8b8d8",
  cyan: "#7dd3fc",
  white: "#eef4fa",
  brightBlack: "#4a5d72",
  brightRed: "#f5a3a8",
  brightGreen: "#7ed7b5",
  brightYellow: "#a5e3fd",
  brightBlue: "#a5e3fd",
  brightMagenta: "#b8c8e0",
  brightCyan: "#a5e3fd",
  brightWhite: "#ffffff",
};

export function Terminal({
  className,
  focusSignal,
  bare,
  onNavigate,
}: {
  className?: string;
  /** Increment to programmatically focus the xterm instance (e.g. when a flyout opens). */
  focusSignal?: number;
  /** Skip the framed chrome (border/glow) when the parent provides its own. */
  bare?: boolean;
  /** Page jump for the shell's `goto` command (flyout closes first). */
  onNavigate?: (hash: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<Shell | null>(null);
  // Palette provider wraps the whole page (via ThemeProvider), so both
  // terminal mounts can recolor the site; the default context degrades
  // to a no-op setPalette outside a provider (embeds, tests).
  const { setPalette } = usePalette();
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  /** A focus request that arrived before async xterm init finished. */
  const pendingFocusRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let term: import("@xterm/xterm").Terminal | null = null;

    (async () => {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      await import("@xterm/xterm/css/xterm.css");
      if (disposed || !containerRef.current) return;

      term = new XTerm({
        theme: PHOSPHOR_THEME,
        fontFamily: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`,
        fontSize: window.innerWidth < 640 ? 12 : 14,
        lineHeight: 1.25,
        cursorBlink: true,
        cursorStyle: "block",
        scrollback: 500,
        convertEol: true,
        // Accessibility: render terminal text into an offscreen live region so
        // screen readers can read the canvas (research iter 39, lorienweb).
        screenReaderMode: true,
        allowProposedApi: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      termRef.current = term;
      fit.fit();

      // A focus request may have arrived while xterm was still loading
      // (dynamic import) — the focusSignal effect's immediate attempt was
      // a no-op then, so honor the pending request now that the terminal
      // exists. Without this, opening the flyout never lands focus in the
      // shell on first open.
      if (pendingFocusRef.current) {
        term.focus();
        pendingFocusRef.current = false;
      }

      // Restore the previous session's command history so Up-arrow
      // recall and the fish-style autosuggestion survive reloads
      // (run-4 iter 3). Effect-only, so this never runs on the server;
      // the store functions swallow storage failures themselves.
      const shell = new Shell(
        {
        write: (text) => term?.write(text),
        writeln: (text) => term?.writeln(text ?? ""),
        clear: () => term?.clear(),
        navigate: onNavigate,
        // `goto <skill>` highlights via the ledger's own reverse-nav
        // event (run-3 iter 23) — no new plumbing, and the ledger gates
        // unlinked skills itself.
        highlightSkill: (name) => dispatchSkillHighlight(name),
        openExternal: (url) => window.open(url, "_blank", "noopener,noreferrer"),
        // `theme` command: read the live dataset value (the shell
        // outlives UI-selector changes, so a captured palette would go
        // stale) and switch through the provider, which persists it.
        getPalette: () => {
          const value = document.documentElement.dataset.palette;
          return isThemePalette(value) ? value : null;
        },
        setPalette: (palette) => setPalette(palette),
        // Live cols (FitAddon refits on resize) so wrapped-line edits
        // redraw the whole logical line instead of per-char erasing.
        cols: () => term?.cols ?? 80,
        },
        {
          initialHistory: loadPersistedHistory(window.localStorage),
          onHistoryChange: (entries) =>
            persistHistory(window.localStorage, entries),
        },
      );
      shellRef.current = shell;
      shell.boot();

      const onResize = () => fit.fit();
      window.addEventListener("resize", onResize);

      term.onData((data) => {
        // Single input path: parse control sequences, type printable runs.
        // (Handling everything here avoids double-typing from onKey + onData.)
        // Keystroke ripple (run-2 IDEA iter 26, built iter 41): typing
        // keystrokes — printable runs, Enter, backspace — notify the
        // glyph field, which throttles them to one ripple per 250ms.
        // Arrow-key sequences and control codes are excluded, so
        // history navigation doesn't ripple. Paste fires once per
        // onData chunk and is throttled at the field.
        if (/[ -~\r\x7f]/.test(data)) {
          window.dispatchEvent(new CustomEvent("terminal-keystroke"));
        }
        let i = 0;
        while (i < data.length) {
          const ch = data[i];
          if (ch === "\r" || ch === "\n") {
            shell.enter();
            i += 1;
          } else if (ch === "\x7f" || ch === "\b") {
            shell.backspace();
            i += 1;
          } else if (ch === "\t") {
            shell.tab();
            i += 1;
          } else if (ch === "\x0c") {
            term?.clear();
            i += 1;
          } else if (ch === "\x1b" && data[i + 1] === "[") {
            const seq = data.slice(i, i + 3);
            if (seq === "\x1b[A") shell.historyUp();
            else if (seq === "\x1b[B") shell.historyDown();
            // Right-arrow / End accept the fish-style ghost suggestion;
            // with no ghost they are no-ops (the cursor is already at
            // the buffer end, since line editing is end-of-line).
            else if (seq === "\x1b[C" || seq === "\x1b[F")
              shell.acceptSuggestion();
            i += 3;
          } else if (ch >= " " && ch <= "~") {
            // Printable run (includes pasted text).
            let j = i;
            while (j < data.length && data[j] >= " " && data[j] <= "~") j += 1;
            for (let k = i; k < j; k++) shell.type(data[k]);
            i = j;
          } else {
            i += 1; // Ignore other control codes.
          }
        }
      });

      return () => window.removeEventListener("resize", onResize);
    })();

    return () => {
      disposed = true;
      shellRef.current = null;
      termRef.current = null;
      term?.dispose();
      term = null;
    };
  }, []);

  // External focus requests (e.g. flyout opened). The request is recorded
  // as pending so a late async init can honor it, and the attempt runs
  // immediately for the already-mounted case (the flyout re-bumps the
  // signal when its panel finishes showing, since an attempt fired while
  // the panel is still visibility-hidden silently fails).
  useEffect(() => {
    if (focusSignal && focusSignal > 0) {
      pendingFocusRef.current = true;
      termRef.current?.focus();
    }
  }, [focusSignal]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label="Interactive portfolio terminal. Type help to begin."
      style={
        bare
          ? { minHeight: 280, overflow: "hidden" }
          : {
              minHeight: 320,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(125, 211, 252, 0.25)",
              boxShadow: "0 0 32px rgba(125, 211, 252, 0.12)",
            }
      }
    />
  );
}
