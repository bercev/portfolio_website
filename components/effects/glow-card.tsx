"use client";

import type { ReactNode } from "react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

export function GlowCard({
  children,
  className,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-6",
        className
      )}
    >
      <GlowingEffect
        disabled={disabled}
        proximity={60}
        spread={40}
        borderWidth={1}
        inactiveZone={0.01}
        glow
        className="rounded-2xl"
      />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}
