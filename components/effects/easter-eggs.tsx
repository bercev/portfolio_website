"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Easter eggs — Konami code Matrix rain, hidden typed commands, secrets counter.
 * Standalone key listeners (works with or without the terminal component).
 */

const SECRETS_KEY = "bercev-secrets-found";

// Konami: ↑ ↑ ↓ ↓ ← → ← → B A
const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const HELLO_ART = [
  "  _          _ _       ",
  " | |__   ___| | | ___  ",
  " | '_ \\ / _ \\ | |/ _ \\ ",
  " | | | |  __/ | | (_) |",
  " |_| |_|\\___|_|_|\\___/ ",
  "",
  "  visitor detected. welcome. ",
].join("\n");

interface SecretDef {
  id: string;
  command: string;
  response: string | (() => string);
  art?: boolean;
}

const SECRETS: SecretDef[] = [
  {
    id: "vim",
    command: "vim",
    response:
      "you're already in the best editor.\ntype :q to exit. (there is no exit. there never was.)",
  },
  {
    id: "emacs",
    command: "emacs",
    response: "a wise choice, but this is a vim household.",
  },
  {
    id: "rm",
    command: "rm -rf /",
    response: "nice try.",
  },
  {
    id: "hello",
    command: "hello",
    response: HELLO_ART,
    art: true,
  },
  {
    id: "sudo",
    command: "sudo hire bercev",
    response: "permission granted. excellent choice.",
  },
  {
    id: "konami",
    command: "__konami__",
    response: "matrix mode engaged.",
  },
  {
    id: "coffee",
    command: "coffee",
    response: "brewing... ☕\ncaffeine levels nominal. ship it.",
  },
];

const TOTAL_SECRETS = SECRETS.length;

function loadSecrets(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(SECRETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveSecrets(ids: string[]) {
  try {
    window.localStorage.setItem(SECRETS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function MatrixRain({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const chars =
      "アカサタナハマヤラワ0123456789⠁⠃⠉⠙⠑⠋⠛⢿⣿<>[]{}#$%".split("");
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array.from({ length: columns }, () =>
      Math.floor(Math.random() * (canvas.height / fontSize)),
    );

    let raf = 0;
    const tick = () => {
      ctx.fillStyle = "rgba(5, 7, 12, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#2fd8ff";
      ctx.font = `${fontSize}px ui-monospace, monospace`;
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    const end = setTimeout(onDone, 10000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(end);
    };
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99,
        pointerEvents: "none",
        opacity: 0.85,
      }}
    />
  );
}

export function EasterEggs() {
  const [toast, setToast] = useState<string | null>(null);
  const [toastIsArt, setToastIsArt] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const konamiIdx = useRef(0);
  const typeBuffer = useRef("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlock = useCallback(
    (id: string, response: string, art = false) => {
      setFound((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        saveSecrets(next);
        return next;
      });
      setToast(response);
      setToastIsArt(art);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    },
    [],
  );

  useEffect(() => {
    setFound(loadSecrets());
    // Announce the counter in the console for completionists.
    // eslint-disable-next-line no-console
    console.log(
      `%csecrets found: ${loadSecrets().length}/${TOTAL_SECRETS} — try the konami code.`,
      "color:#2fd8ff;font-family:monospace",
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in inputs/textareas.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // --- Konami code ---
      const expected = KONAMI[konamiIdx.current];
      if (e.key === expected || e.key.toLowerCase() === expected) {
        konamiIdx.current++;
        if (konamiIdx.current === KONAMI.length) {
          konamiIdx.current = 0;
          setMatrix(true);
          unlock("konami", "matrix mode engaged.");
        }
        return;
      }
      konamiIdx.current = e.key === KONAMI[0] ? 1 : 0;

      // --- Typed commands (buffer + Enter) ---
      if (e.key === "Enter") {
        const cmd = typeBuffer.current.trim().toLowerCase();
        typeBuffer.current = "";
        const secret = SECRETS.find((s) => s.command === cmd);
        if (secret && typeof secret.response === "string") {
          unlock(secret.id, secret.response, secret.art);
        }
        return;
      }
      if (e.key === "Escape") {
        typeBuffer.current = "";
        setToast(null);
        return;
      }
      if (e.key.length === 1) {
        typeBuffer.current = (typeBuffer.current + e.key).slice(-32);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlock]);

  return (
    <>
      {matrix ? <MatrixRain onDone={() => setMatrix(false)} /> : null}
      {toast ? (
        <div
          role="status"
          onClick={() => setToast(null)}
          style={{
            position: "fixed",
            bottom: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 98,
            maxWidth: "min(560px, 90vw)",
            padding: toastIsArt ? "20px 24px" : "14px 20px",
            backgroundColor: "rgba(5, 7, 12, 0.92)",
            border: "1px solid rgba(47, 216, 255, 0.4)",
            borderRadius: 6,
            color: "#2fd8ff",
            fontFamily:
              "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            cursor: "pointer",
            boxShadow: "0 0 32px rgba(47, 216, 255, 0.25)",
          }}
        >
          {toast}
          <div
            style={{
              marginTop: 10,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(234, 246, 251, 0.4)",
            }}
          >
            secrets found: {found.length}/{TOTAL_SECRETS} — click to dismiss
          </div>
        </div>
      ) : null}
    </>
  );
}
