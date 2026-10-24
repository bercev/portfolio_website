"use client";

import { useEffect, useRef } from "react";

import { Shell } from "./shell";

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
}: {
  className?: string;
  /** Increment to programmatically focus the xterm instance (e.g. when a flyout opens). */
  focusSignal?: number;
  /** Skip the framed chrome (border/glow) when the parent provides its own. */
  bare?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<Shell | null>(null);
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);

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

      const shell = new Shell({
        write: (text) => term?.write(text),
        writeln: (text) => term?.writeln(text ?? ""),
        clear: () => term?.clear(),
      });
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

  // External focus requests (e.g. flyout opened).
  useEffect(() => {
    if (focusSignal && focusSignal > 0) termRef.current?.focus();
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
