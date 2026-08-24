import type { ReactNode } from "react";

import { ChromaCard } from "@/components/effects/chroma-card";
import { PixelCard } from "@/components/effects/pixel-card";
import { cn } from "@/lib/utils";

export function PortfolioCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-portfolio-card
      className={cn("cursor-target h-full", className)}
    >
      <PixelCard variant="blue" noFocus>
        <ChromaCard>
          <div className="h-full p-6 sm:p-7">{children}</div>
        </ChromaCard>
      </PixelCard>
    </div>
  );
}
