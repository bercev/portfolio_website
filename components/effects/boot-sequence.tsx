"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BOOT_DURATION_MS,
  BOOT_FADE_MS,
  BOOT_RING_LABEL,
} from "@/lib/boot-ring";

/**
 * Boot sequence — first-visit light ring (RUN10-BOOT).
 * A spinning gradient light ring with a breathing glow heart, shown
 * for 2.6s while the particle BERAT gathers behind it, then fades out
 * to reveal the site. Skippable on click/tap, skipped on repeat visits
 * (localStorage), skipped when prefers-reduced-motion is set. The
 * phone skip is gone (RUN10-BOOT): the old BIOS text wall was the
 * reason phones skipped the theater; a light ring is the gathering
 * moment itself and shows at 390px too. The reveal gate in
 * light-ribbons.tsx (bootExpected) mirrors this gate.
 */

const BOOT_KEY = "bercev-has-booted";

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
    }, BOOT_FADE_MS);
    timers.current.push(t);
  }, []);

  // Set the real visibility after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    // Intentional mount guard: real visibility is client-only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (shouldBoot()) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const end = setTimeout(finish, BOOT_DURATION_MS);
    timers.current.push(end);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [finish, visible]);

  if (!visible) return null;

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
        transition: `opacity ${BOOT_FADE_MS}ms ease-out`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "28px",
        }}
      >
        <div className="boot-ring-wrap" aria-hidden="true">
          <div className="boot-ring-halo" />
          <div className="boot-ring" data-boot-ring />
          <div className="boot-ring-heart" />
        </div>
        <div className="boot-ring-label">{BOOT_RING_LABEL}</div>
      </div>
    </div>
  );
}
