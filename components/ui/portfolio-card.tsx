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
    <BorderGlow className={cn("h-full p-6 sm:p-7", className)}>
      {children}
    </BorderGlow>
  );
}
