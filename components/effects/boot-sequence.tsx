"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Boot sequence — BIOS-style cold boot overlay on first visit.
 * 2–3 seconds of hardware checks, then fades out to reveal the site.
 * Skippable on click, skipped on repeat visits (localStorage), skipped
 * when prefers-reduced-motion is set.
 */

const BOOT_KEY = "bercev-has-booted";

const BOOT_LINES: Array<{ text: string; delay: number; color?: "ok" | "dim" | "accent" }> = [
  { text: "BERCEV BIOS v2.6 — checking hardware...", delay: 0 },
  { text: "memory check ........ OK (16384 MB)", delay: 320, color: "ok" },
  { text: "mounting /dev/career ........ OK", delay: 620, color: "ok" },
  { text: "loading kernel modules: curiosity.o, persistence.ko, shipped.so", delay: 950, color: "dim" },
  { text: "starting portfolio daemon ........ OK", delay: 1350, color: "ok" },
  { text: "initializing phosphor display ........ OK", delay: 1650, color: "ok" },
  { text: "", delay: 1900 },
  { text: "> welcome, visitor. system ready.", delay: 2000, color: "accent" },
];

const BOOT_DURATION_MS = 2600;

function shouldBoot(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return window.localStorage.getItem(BOOT_KEY) !== "1";
  } catch {
    return true;
  }
}

export function BootSequence() {
  // Initialize to false (matches SSR) to avoid hydration mismatch;
  // the real value is set in useEffect after mount.
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [shownCount, setShownCount] = useState(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFading(true);
    const t = setTimeout(() => {
      setVisible(false);
      try {
        window.localStorage.setItem(BOOT_KEY, "1");
      } catch {
        // storage unavailable — boot again next time, harmless
      }
    }, 450);
    timers.current.push(t);
  }, []);

  // Set the real visibility after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    if (shouldBoot()) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    BOOT_LINES.forEach((line, i) => {
      const t = setTimeout(() => setShownCount(i + 1), line.delay);
      timers.current.push(t);
    });
    const end = setTimeout(finish, BOOT_DURATION_MS);
    timers.current.push(end);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [finish, visible]);

  if (!visible) return null;

  const colorFor = (c?: "ok" | "dim" | "accent") => {
    switch (c) {
      case "ok":
        return "#4ade80"; // green OK
      case "dim":
        return "rgba(234, 246, 251, 0.55)";
      case "accent":
        return "#7dd3fc"; // cyan phosphor
      default:
        return "#eef4fa";
    }
  };

  return (
    <div
      role="status"
      aria-label="System boot sequence"
      onClick={finish}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "#05070c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.45s ease-out",
      }}
    >
      <div
        style={{
          width: "min(680px, 88vw)",
          fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
          fontSize: "clamp(13px, 2.4vw, 16px)",
          lineHeight: 1.9,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {BOOT_LINES.slice(0, shownCount).map((line, i) => (
          <div key={i} style={{ color: colorFor(line.color), minHeight: "1.9em" }}>
            {line.text}
            {i === shownCount - 1 && <span className="boot-cursor" />}
          </div>
        ))}
      </div>
    </div>
  );
}
