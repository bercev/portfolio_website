"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";

import { ExternalLink } from "@/components/ui/external-link";

interface HoverPreviewProps {
  readonly children: ReactNode;
  readonly href: string;
  readonly imageUrl: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly rotation?: number;
  readonly className?: string;
}

export function HoverPreview({
  children,
  href,
  imageUrl,
  imageWidth,
  imageHeight,
  rotation = -3,
  className,
}: HoverPreviewProps) {
  const [isActive, setIsActive] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      data-hover-preview
      className="relative inline-flex"
      onHoverStart={() => setIsActive(true)}
      onHoverEnd={() => setIsActive(false)}
      onFocusCapture={() => setIsActive(true)}
      onBlurCapture={() => setIsActive(false)}
    >
      <ExternalLink href={href} className={className}>
        {children}
      </ExternalLink>

      <AnimatePresence initial={false}>
        {isActive ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[calc(100%+0.875rem)] left-0 z-[var(--z-site-navigation)] lg:bottom-auto lg:left-full lg:top-1/2 lg:-translate-y-1/2"
          >
            <motion.span
              data-hover-preview-image
              className="block w-[min(34rem,80vw)] overflow-hidden rounded-[var(--radius)] border border-border bg-card p-1 shadow-xl shadow-foreground/10"
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, rotate: 0, scale: 0.96, y: 10 }
              }
              animate={{ opacity: 1, rotate: rotation, scale: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, rotate: 0, scale: 0.98, y: 6 }
              }
              transition={{
                duration: shouldReduceMotion ? 0 : 0.18,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Image
                src={imageUrl}
                alt=""
                width={imageWidth}
                height={imageHeight}
                sizes="(min-width: 1024px) 34rem, 80vw"
                className="h-auto w-full rounded-[calc(var(--radius)-2px)] object-cover"
              />
            </motion.span>
          </span>
        ) : null}
      </AnimatePresence>
    </motion.span>
  );
}
