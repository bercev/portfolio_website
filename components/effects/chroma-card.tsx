"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
  type EffectProfile,
} from "@/lib/effect-policy";
import { cn } from "@/lib/utils";

type ChromaStyle = CSSProperties & {
  "--chroma-x": string;
  "--chroma-y": string;
};

export function ChromaCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<EffectProfile["mode"]>("static");

  useEffect(() => {
    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    const updateMode = () => {
      setMode(
        getEffectProfile({
          finePointer: finePointer.matches,
          mobile: mobile.matches,
          reducedMotion: reducedMotion.matches,
        }).mode,
      );
    };

    updateMode();
    finePointer.addEventListener("change", updateMode);
    mobile.addEventListener("change", updateMode);
    reducedMotion.addEventListener("change", updateMode);

    return () => {
      finePointer.removeEventListener("change", updateMode);
      mobile.removeEventListener("change", updateMode);
      reducedMotion.removeEventListener("change", updateMode);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (mode === "static") {
      root.dataset.chromaActive = "false";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        root.dataset.chromaActive = entry.isIntersecting ? "true" : "false";
      },
      { threshold: 0.35 },
    );
    observer.observe(root);

    return () => observer.disconnect();
  }, [mode]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root || mode !== "enhanced") return;

    const bounds = root.getBoundingClientRect();
    root.style.setProperty("--chroma-x", `${event.clientX - bounds.left}px`);
    root.style.setProperty("--chroma-y", `${event.clientY - bounds.top}px`);
  };

  const style: ChromaStyle = {
    "--chroma-x": "50%",
    "--chroma-y": "50%",
  };

  return (
    <div
      ref={rootRef}
      data-chroma-card
      data-chroma-mode={mode}
      data-chroma-active="false"
      className={cn("chroma-card group relative isolate h-full", className)}
      onPointerMove={mode === "enhanced" ? handlePointerMove : undefined}
      style={style}
    >
      <span aria-hidden="true" data-chroma-glow />
      <span aria-hidden="true" data-chroma-sweep />
      <div data-chroma-surface className="relative z-[1] h-full">
        {children}
      </div>
    </div>
  );
}
