"use client";

import { useEffect, useRef } from "react";

import { Shell } from "./shell";

/**
 * Portfolio terminal — a real working shell (xterm.js) themed phosphor.
 * Mounts client-side only; the shell itself is framework-free.
 */

const PHOSPHOR_THEME = {
  background: "#05070c",
  foreground: "#c9f2ff",
  cursor: "#2fd8ff",
  cursorAccent: "#05070c",
  selectionBackground: "rgba(47, 216, 255, 0.25)",
  black: "#05070c",
  red: "#ff6b6b",
  green: "#4ade80",
  yellow: "#ffb648",
  blue: "#2fd8ff",
  magenta: "#c084fc",
  cyan: "#2fd8ff",
  white: "#eaf6fb",
  brightBlack: "#4a5d72",
  brightRed: "#ff8f8f",
  brightGreen: "#6ee7a0",
  brightYellow: "#ffd166",
  brightBlue: "#7ce7ff",
  brightMagenta: "#d8b4fe",
  brightCyan: "#7ce7ff",
  brightWhite: "#ffffff",
};

export function Terminal({
  className,
  focusSignal,
}: {
  className?: string;
  /** Increment to programmatically focus the xterm instance (e.g. when a flyout opens). */
  focusSignal?: number;
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
        allowProposedApi: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
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
      term?.dispose();
      term = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label="Interactive portfolio terminal. Type help to begin."
      style={{
        minHeight: 320,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(47, 216, 255, 0.25)",
        boxShadow: "0 0 32px rgba(47, 216, 255, 0.12)",
      }}
    />
  );
}
