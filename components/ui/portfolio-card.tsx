import type { ReactNode } from "react";

import { BorderGlow } from "@/components/effects/border-glow";
import { cn } from "@/lib/utils";

export function PortfolioCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-portfolio-card className={cn("h-full", className)}>
      <BorderGlow className="h-full p-6 sm:p-7">{children}</BorderGlow>
    </div>
  );
}
