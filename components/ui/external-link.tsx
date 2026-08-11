import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ExternalLinkProps = Omit<
  ComponentPropsWithoutRef<"a">,
  "children" | "href" | "rel" | "target"
> & {
  children: ReactNode;
  href: string;
};

export function ExternalLink({
  children,
  className,
  ...props
}: ExternalLinkProps) {
  return (
    <a
      {...props}
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-portfolio-accent hover:underline",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowUpRightIcon size={16} weight="bold" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
