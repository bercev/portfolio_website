"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

type GlowStyle = CSSProperties & {
  "--glow-x": string;
  "--glow-y": string;
  "--glow-opacity": number;
};

export function BorderGlow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const bounds = root.getBoundingClientRect();
    root.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
    root.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
    root.style.setProperty("--glow-opacity", "1");
  };

  const hideGlow = () => {
    rootRef.current?.style.setProperty("--glow-opacity", "0");
  };

  const glowStyle: GlowStyle = {
    "--glow-x": "50%",
    "--glow-y": "50%",
    "--glow-opacity": 0,
  };
  const glowBackground =
    "radial-gradient(440px circle at var(--glow-x) var(--glow-y), color-mix(in srgb, var(--effect-glow) 34%, transparent), transparent 58%)";

  return (
    <div
      ref={rootRef}
      className={cn(
        "group relative isolate overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_3px_color-mix(in_srgb,var(--shadow-color)_var(--shadow-opacity),transparent)] transition-transform duration-300 focus-within:ring-2 focus-within:ring-portfolio-accent/70 hover:-translate-y-0.5",
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={hideGlow}
      style={glowStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[var(--glow-opacity)] transition-opacity duration-200"
        style={{ background: glowBackground }}
      />
      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
}
