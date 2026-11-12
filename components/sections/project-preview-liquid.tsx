/**
 * Liquid-morph project preview (run-10 RUN10-LIQUID).
 *
 * Reel 7 liquid morph + the OpenMotion UI Morph example, rebuilt in the
 * site's own Motion stack: while its row is hovered/focused (desktop) or
 * tapped (mobile), the rest preview morphs into a slowly wobbling liquid
 * blob with an elastic overshoot scale, a glow wash blooms over the
 * image, and a single shared liquid blob (one layoutId, reel-4 rule 19)
 * glides between the rows' previews. At rest the preview is the same
 * calm rectangle as before — no border, no rotate, no pen trace.
 *
 * The shared blob lives OUTSIDE the morphing frame: the frame clips its
 * contents (overflow hidden + blob radius), so a blob inside it would be
 * cut off at the frame's edge. The frame is the element that scales and
 * rounds; the blob is the element that travels.
 *
 * Reduced motion: the plain static preview, byte-identical to the
 * pre-liquid markup — no morph frame, no blob, no glow (native hook —
 * motion's useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { AnimatePresence, motion } from "motion/react";

import { ChromaticImage } from "@/components/ui/chromatic-image";
import {
  LIQUID_BLOB_LAYOUT_ID,
  LIQUID_BLOB_RADII,
  LIQUID_BLOB_SPRING,
  LIQUID_SCALE,
  LIQUID_SCALE_SPRING,
  LIQUID_WOBBLE_S,
} from "@/lib/project-liquid";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type ProjectPreview = {
  readonly src: string;
  readonly alt: string;
  /** Raster proofs get the Aceternity Chromatic Image treatment. */
  readonly chromatic?: boolean;
};

export function ProjectPreviewLiquid({
  preview,
  active,
}: {
  readonly preview: ProjectPreview;
  /** The row is hovered/focused (desktop) or inside a tap pulse (mobile). */
  readonly active: boolean;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const morph = active && !reduceMotion;

  const image = preview.chromatic ? (
    <ChromaticImage
      src={preview.src}
      alt={preview.alt}
      width={800}
      height={560}
      className="journey-project-rest-preview"
    />
  ) : (
    <span className="journey-project-rest-preview">
      {/* eslint-disable-next-line @next/next/no-img-element -- local static preview crop */}
      <img src={preview.src} alt={preview.alt} width={800} height={560} />
    </span>
  );

  if (reduceMotion) {
    return <span className="journey-project-preview">{image}</span>;
  }

  return (
    <span className="journey-project-preview journey-project-preview-liquid">
      {/* Shared liquid blob: one element, one layoutId — when the hover
          moves between rows, motion morphs this blob from the old
          preview's box to the new one. AnimatePresence keeps the exiting
          instance alive long enough for the handoff. */}
      <AnimatePresence>
        {morph ? (
          <motion.span
            key="liquid-blob"
            data-liquid-blob
            aria-hidden="true"
            layoutId={LIQUID_BLOB_LAYOUT_ID}
            className="journey-project-liquid-blob"
            initial={{ opacity: 0, borderRadius: LIQUID_BLOB_RADII[0] }}
            animate={{
              opacity: 0.85,
              borderRadius: LIQUID_BLOB_RADII,
            }}
            exit={{ opacity: 0 }}
            transition={{
              layout: LIQUID_BLOB_SPRING,
              opacity: { duration: 0.18 },
              borderRadius: {
                duration: LIQUID_WOBBLE_S,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          />
        ) : null}
      </AnimatePresence>
      {/* The morphing frame: elastic scale + blob-radius wobble while
          active, settling back to the calm rectangle on leave. */}
      <motion.span
        data-liquid-preview
        data-liquid-active={morph || undefined}
        className="journey-project-preview-liquid-frame"
        initial={false}
        animate={{
          scale: morph ? LIQUID_SCALE : 1,
          borderRadius: morph ? LIQUID_BLOB_RADII : "0px",
        }}
        transition={{
          scale: LIQUID_SCALE_SPRING,
          borderRadius: morph
            ? {
                duration: LIQUID_WOBBLE_S,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : { duration: 0.45, ease: SITE_EASE },
        }}
      >
        {/* Glow wash over the image while morphed — opacity only, so the
            image itself is never re-tinted by an animated shadow. (On the
            near-white Vitae screenshot the screen-blend wash is faint by
            construction; the rim below is the glow that reads there.) */}
        <motion.span
          aria-hidden="true"
          className="journey-project-liquid-glow"
          initial={false}
          animate={{ opacity: morph ? 0.65 : 0 }}
          transition={{ duration: 0.3, ease: SITE_EASE }}
        />
        {/* Light rim just inside the frame's edge — visible on light and
            dark previews alike, following the wobbling radius. */}
        <motion.span
          aria-hidden="true"
          className="journey-project-liquid-rim"
          initial={false}
          animate={{ opacity: morph ? 1 : 0 }}
          transition={{ duration: 0.3, ease: SITE_EASE }}
        />
        {image}
      </motion.span>
    </span>
  );
}
