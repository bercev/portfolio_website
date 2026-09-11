"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PLAIN_PATH, isPlainPath } from "@/lib/motion-preference";
import { cn } from "@/lib/utils";

export function MotionVersionLink({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const plain = isPlainPath(pathname);

  return (
    <Link
      href={plain ? "/" : PLAIN_PATH}
      className={cn("cursor-target", className)}
      data-motion-version-link
    >
      {plain ? "View with animations" : "View without animations"}
    </Link>
  );
}
