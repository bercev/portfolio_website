"use client";

import { AnimatePresence, motion } from "motion/react";
import type { FocusEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ExternalLink } from "@/components/ui/external-link";
import {
  PREVIEW_SWEEP_BAND_FADE_START,
  PREVIEW_SWEEP_BAND_OPACITY,
  PREVIEW_SWEEP_BAND_WIDTH_PX,
  PREVIEW_SWEEP_SHEEN_MS,
  PREVIEW_SWEEP_WIPE_MS,
  previewSweepBandLeft,
  previewSweepClip,
} from "@/components/ui/hover-preview-sweep";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type HoverPreviewProps = {
  readonly title: string;
  readonly href: string;
  readonly headingClassName?: string;
  readonly linkClassName?: string;
  readonly linkIconSize?: number;
  readonly previewClassName?: string;
} & (
  | { readonly pdfUrl: string; readonly image?: never }
  | {
      readonly pdfUrl?: never;
      readonly image: { readonly src: string; readonly alt: string };
    }
);

const CLOSE_DELAY_MS = 180;

// Site ease-out (reel-4 R1), shared by the pop and the sweep.
const SWEEP_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HoverPreview({
  title,
  href,
  pdfUrl,
  image,
  headingClassName,
  linkClassName,
  linkIconSize,
  previewClassName,
}: HoverPreviewProps) {
  const [isActive, setIsActive] = useState(false);
  const shouldReduceMotion = usePrefersReducedMotion();
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

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    hasFocusRef.current = false;
    requestClose();
  };

  const readerSrc = pdfUrl
    ? `${pdfUrl}#page=1&view=FitH&toolbar=0&navpanes=0`
    : undefined;
  const readerTitle = title.split(":", 1)[0];
  const isPaper = Boolean(pdfUrl);

  return (
    <motion.div
      {...(isPaper
        ? { "data-hover-preview": true }
        : { "data-project-preview": true })}
      className={isPaper ? "max-w-full" : "relative w-fit max-w-full"}
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
            className={
              isPaper
                ? "pointer-events-auto journey-pub-preview-slot"
                : "pointer-events-auto absolute bottom-full left-0 z-[var(--z-site-navigation)] pb-3 lg:bottom-auto lg:left-full lg:top-1/2 lg:-translate-y-1/2 lg:pb-0 lg:pl-4"
            }
          >
            <motion.span
              data-pdf-reader={isPaper ? true : undefined}
              data-hover-preview-image
              role="region"
              aria-label={
                isPaper
                  ? `${title} compact PDF reader`
                  : `${title} project preview`
              }
              // `relative` makes the card the sheen band's containing block:
              // without it the band would position against the slot/wrapper
              // (the project variant's wrapper is wider than the card).
              className={`${
                previewClassName
                  ? previewClassName
                  : "block w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-none bg-card shadow-[6px_8px_0_color-mix(in_srgb,var(--foreground)_10%,transparent)]"
              } relative`}
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  // R10: popovers start at 0.95 scale (RUN8-R10-RESIDUAL).
                  // RUN9-HOVER-SWEEP: the card is revealed by a left->right
                  // wipe (Revolut Single Use Pulse Card Sweep Morph, 60fps
                  // shot 2114) while a sheen band rides its leading edge.
                  : {
                      opacity: 0,
                      scale: 0.95,
                      y: 10,
                      clipPath: previewSweepClip(0),
                    }
              }
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                ...(shouldReduceMotion
                  ? {}
                  : { clipPath: previewSweepClip(1) }),
                // R2: entrance 220ms, site ease-out. R9 evaluated: the rise IS
                // the entrance, so R1 (ease-out for entrances) governs it;
                // ease-in-out is reserved for non-entrance moves
                // (case-study expand, RUN8-CASESTUDY).
                transition: {
                  duration: shouldReduceMotion ? 0 : 0.22,
                  ease: SWEEP_EASE,
                  ...(shouldReduceMotion
                    ? {}
                    : {
                        clipPath: {
                          duration: PREVIEW_SWEEP_WIPE_MS / 1000,
                          ease: SWEEP_EASE,
                        },
                      }),
                },
              }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : {
                      opacity: 0,
                      scale: 0.98,
                      y: 6,
                      // R14: exit 175ms = 220ms x 0.8, same ease-out family.
                      transition: {
                        duration: 0.175,
                        ease: [0.16, 1, 0.3, 1],
                      },
                    }
              }
            >
              {isPaper && readerSrc ? (
                <>
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
                    className="h-[min(28rem,60vh)] w-full rounded-none bg-white"
                  />
                </>
              ) : image ? (
                // eslint-disable-next-line @next/next/no-img-element -- local SVG preview crop
                <img
                  src={image.src}
                  alt={image.alt}
                  width={800}
                  height={560}
                  className="block h-auto w-full"
                />
              ) : null}
              {/* RUN9-HOVER-SWEEP: the sheen band rides the wipe's leading
                  edge across the card face, then dissolves — the card returns
                  to its pristine resting state. Entrance-only (Revolut's idle
                  ambient loop is deliberately not carried over: a repeating
                  sweep over a PDF reader would distract from reading).
                  Reduced motion renders no band at all. */}
              {shouldReduceMotion ? null : (
                <motion.span
                  data-preview-sweep
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 z-10"
                  style={{ width: PREVIEW_SWEEP_BAND_WIDTH_PX }}
                  initial={{
                    left: previewSweepBandLeft(0),
                    opacity: PREVIEW_SWEEP_BAND_OPACITY,
                  }}
                  animate={{
                    left: previewSweepBandLeft(1),
                    opacity: 0,
                    transition: {
                      duration: PREVIEW_SWEEP_SHEEN_MS / 1000,
                      ease: SWEEP_EASE,
                      opacity: {
                        delay:
                          (PREVIEW_SWEEP_SHEEN_MS *
                            PREVIEW_SWEEP_BAND_FADE_START) /
                          1000,
                        duration:
                          (PREVIEW_SWEEP_SHEEN_MS *
                            (1 - PREVIEW_SWEEP_BAND_FADE_START)) /
                          1000,
                        ease: "linear",
                      },
                    },
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="block h-full w-full"
                    style={{
                      transform: "skewX(-12deg)",
                      background:
                        "linear-gradient(100deg, transparent 0%, color-mix(in srgb, var(--accent-neon) 30%, transparent) 50%, transparent 100%)",
                    }}
                  />
                </motion.span>
              )}
            </motion.span>
          </span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
