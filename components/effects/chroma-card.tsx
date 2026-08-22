import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ChromaCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-chroma-card
      className={cn("chroma-card group relative isolate h-full", className)}
    >
      <div data-chroma-surface className="relative h-full">
        {children}
      </div>
    </div>
  );
}
