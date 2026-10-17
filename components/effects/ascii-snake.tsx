"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Playable ASCII Snake for The Shipyard (Projects chapter).
 * Rendered in phosphor-terminal characters on canvas: the snake is `▓`,
 * bugs are `🐛`. Keys are only captured while the game has focus so page
 * scroll is never hijacked.
 */

const COLS = 28;
const ROWS = 18;
const HIGH_SCORE_KEY = "bercev-snake-high";

type Vec = { readonly x: number; readonly y: number };
type Phase = "ready" | "playing" | "over";

const opposite = (a: Vec, b: Vec) => a.x === -b.x && a.y === -b.y;

function randomBug(snake: readonly Vec[]): Vec {
  const occupied = new Set(snake.map((s) => s.y * COLS + s.x));
  const free: number[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  const pick = free[Math.floor(Math.random() * free.length)] ?? 0;
  return { x: pick % COLS, y: Math.floor(pick / COLS) };
}

function readHighScore(): number {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function AsciiSnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState<number>(() =>
    typeof window === "undefined" ? 0 : readHighScore(),
  );
  const [focused, setFocused] = useState(false);
  const stateRef = useRef<{
    snake: Vec[];
    dir: Vec;
    queued: Vec | null;
    bug: Vec;
    eaten: number;
  }>({
    snake: [
      { x: 6, y: 9 },
      { x: 5, y: 9 },
      { x: 4, y: 9 },
    ],
    dir: { x: 1, y: 0 },
    queued: null,
    bug: { x: 20, y: 9 },
    eaten: 0,
  });

  const reset = useCallback(() => {
    stateRef.current = {
      snake: [
        { x: 6, y: 9 },
        { x: 5, y: 9 },
        { x: 4, y: 9 },
      ],
      dir: { x: 1, y: 0 },
      queued: null,
      bug: { x: 20, y: 9 },
      eaten: 0,
    };
    setScore(0);
    setPhase("playing");
  }, []);

  // Game tick.
  useEffect(() => {
    if (phase !== "playing") return;
    let paused = document.hidden;
    const onVis = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    const speed = Math.max(70, 150 - stateRef.current.eaten * 6);
    const id = window.setInterval(() => {
      if (paused) return; // don't advance while the tab is hidden
      const s = stateRef.current;
      if (s.queued && !opposite(s.queued, s.dir)) s.dir = s.queued;
      s.queued = null;
      const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
      const hitWall =
        head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
      const hitSelf = s.snake.some((seg) => seg.x === head.x && seg.y === head.y);
      if (hitWall || hitSelf) {
        setPhase("over");
        setHigh((prev) => {
          const next = Math.max(prev, s.eaten);
          try {
            window.localStorage.setItem(HIGH_SCORE_KEY, String(next));
          } catch {
            /* private mode */
          }
          return next;
        });
        return;
      }
      s.snake.unshift(head);
      if (head.x === s.bug.x && head.y === s.bug.y) {
        s.eaten += 1;
        s.bug = randomBug(s.snake);
        setScore(s.eaten);
      } else {
        s.snake.pop();
      }
    }, speed);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase]);

  // Render loop.
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = w / COLS;
        const ch = h / ROWS;
        ctx.fillStyle = "#05070c";
        ctx.fillRect(0, 0, w, h);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fontPx = Math.min(cw, ch) * 0.95;
        ctx.font = `${fontPx}px ui-monospace, Menlo, monospace`;

        const s = stateRef.current;
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const cx = x * cw + cw / 2;
            const cy = y * ch + ch / 2;
            const isHead = s.snake[0].x === x && s.snake[0].y === y;
            const isBody = s.snake.some((seg, i) => i > 0 && seg.x === x && seg.y === y);
            if (isHead) {
              ctx.fillStyle = "#7dd3fc";
              ctx.fillText("█", cx, cy);
            } else if (isBody) {
              ctx.fillStyle = "rgba(125, 211, 252, 0.75)";
              ctx.fillText("▓", cx, cy);
            } else if (s.bug.x === x && s.bug.y === y) {
              ctx.fillText("🐛", cx, cy);
            } else {
              ctx.fillStyle = "rgba(125, 147, 168, 0.16)";
              ctx.fillText("·", cx, cy);
            }
          }
        }

        // Overlays.
        if (phase !== "playing") {
          ctx.fillStyle = "rgba(5, 7, 12, 0.72)";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#eef4fa";
          const lines =
            phase === "over"
              ? ["SEGFAULT — like my first internship", `score ${s.eaten}`, "press enter to recompile"]
              : ["SNAKE // debug build", "eat the 🐛", "press enter to run"];
          ctx.font = `${Math.min(20, w / 26)}px ui-monospace, Menlo, monospace`;
          lines.forEach((line, i) => {
            ctx.fillStyle = i === 0 ? "#7dd3fc" : "#eef4fa";
            ctx.fillText(line, w / 2, h / 2 - (lines.length - 1) * 16 + i * 32);
          });
        }
      }
      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [phase]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key;
    const dirs: Record<string, Vec> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
      W: { x: 0, y: -1 },
      S: { x: 0, y: 1 },
      A: { x: -1, y: 0 },
      D: { x: 1, y: 0 },
    };
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      reset();
      return;
    }
    const dir = dirs[key];
    if (dir) {
      // Only this handler runs (attached to the focused wrapper), so page
      // scroll is untouched when the game isn't focused.
      e.preventDefault();
      if (phase === "playing") stateRef.current.queued = dir;
      else if (phase === "ready") reset();
    }
  };

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="application"
      aria-label="Playable ASCII snake game. Use arrow keys or WASD when focused."
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={() => wrapRef.current?.focus()}
      className="journey-snake"
      data-snake-focused={focused ? "true" : undefined}
    >
      <div className="journey-snake-head">
        <span className="journey-snake-title">
          <span className="journey-build-log-prompt">$</span> ./snake
        </span>
        <span className="journey-snake-score" aria-live="polite">
          score {score} · best {high}
        </span>
      </div>
      <canvas ref={canvasRef} className="journey-snake-canvas" />
    </div>
  );
}
