"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { FocusEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ExternalLink } from "@/components/ui/external-link";

interface HoverPreviewProps {
  readonly title: string;
  readonly href: string;
  readonly pdfUrl: string;
  readonly headingClassName?: string;
  readonly linkClassName?: string;
  readonly linkIconSize?: number;
  readonly previewClassName?: string;
}

const CLOSE_DELAY_MS = 180;

export function HoverPreview({
  title,
  href,
  pdfUrl,
  headingClassName,
  linkClassName,
  linkIconSize,
  previewClassName,
}: HoverPreviewProps) {
  const [isActive, setIsActive] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPointerRef = useRef(false);
  const hasFocusRef = useRef(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;

    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const openPreview = useCallback(() => {
    clearCloseTimer();
    setIsActive(true);
  }, [clearCloseTimer]);

  const requestClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      if (!hasPointerRef.current && !hasFocusRef.current) {
        setIsActive(false);
      }
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    hasFocusRef.current = false;
    requestClose();
  };

  const readerSrc = `${pdfUrl}#page=1&view=FitH&toolbar=0&navpanes=0`;
  const readerTitle = title.split(":", 1)[0];

  return (
    <motion.span
      data-hover-preview
      className="relative block w-fit max-w-full"
      onPointerEnter={() => {
        hasPointerRef.current = true;
        openPreview();
      }}
      onPointerLeave={() => {
        hasPointerRef.current = false;
        requestClose();
      }}
      onFocusCapture={() => {
        hasFocusRef.current = true;
        openPreview();
      }}
      onBlurCapture={handleBlur}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;

        clearCloseTimer();
        hasPointerRef.current = false;
        hasFocusRef.current = false;
        setIsActive(false);
      }}
    >
      <h3 className={headingClassName}>
        <ExternalLink
          href={href}
          className={linkClassName}
          iconSize={linkIconSize}
        >
          {title}
        </ExternalLink>
      </h3>

      <AnimatePresence initial={false}>
        {isActive ? (
          <span
            className="pointer-events-auto absolute bottom-full left-0 z-[var(--z-site-navigation)] pb-3 lg:bottom-auto lg:left-full lg:top-1/2 lg:-translate-y-1/2 lg:pb-0 lg:pl-4"
          >
            <motion.span
              data-pdf-reader
              data-hover-preview-image
              role="region"
              aria-label={`${title} compact PDF reader`}
              className={
                previewClassName
                  ? previewClassName
                  : "block w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius)] border border-border bg-card p-1 shadow-xl shadow-foreground/10"
              }
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, y: 10 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.98, y: 6 }
              }
              transition={{
                duration: shouldReduceMotion ? 0 : 0.18,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <span className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Scroll inside to read
                </span>
                <ExternalLink
                  href={href}
                  className="shrink-0 text-xs font-semibold text-foreground"
                >
                  Open full paper
                </ExternalLink>
              </span>
              <iframe
                src={readerSrc}
                title={`${readerTitle} PDF preview`}
                loading="lazy"
                className="h-[min(38rem,70vh)] w-full rounded-[calc(var(--radius)-2px)] bg-white"
              />
            </motion.span>
          </span>
        ) : null}
      </AnimatePresence>
    </motion.span>
  );
}
