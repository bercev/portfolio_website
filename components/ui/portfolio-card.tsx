import type { ReactNode } from "react";

import { ChromaCard } from "@/components/effects/chroma-card";
import { cn } from "@/lib/utils";

export function PortfolioCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-portfolio-card className={cn("cursor-target h-full", className)}>
      <ChromaCard>
        <div className="h-full border border-foreground p-6 sm:p-7">
          {children}
        </div>
      </ChromaCard>
    </div>
  );
}
