/**
 * Scroll-linked curtain reveal for project case figures (RUN10-CURTAIN).
 *
 * The motion.dev free Scroll Image Reveal pattern, rebuilt in the
 * site's own Motion stack: the figure's clip-path opens from the
 * center as it scrolls in (see lib/case-curtain.ts for the model),
 * while the figure drifts gently against the scroll (parallax).
 * NOT the paid Motion+ curtains() API.
 *
 * The curtain wraps the ArchitectureDiagram inside the expanded
 * case-study panel — the diagram's own first-view assembly (nodes
 * light in sequence, arrows draw in) runs inside it: the SVG's
 * IntersectionObserver sees the clipped area, so the assembly starts
 * as the curtain opens rather than while it is still shut. The
 * curtain's two glowing leading edges ride the clip boundaries
 * (see lib/case-curtain.ts): without them a node straddling the cut
 * reads as a broken box — with them the cut reads as a curtain.
 * Reduced motion renders the figure fully, with no clip, no drift,
 * and no edges, via the native hook (motion's useReducedMotion() is
 * unreliable in this app, run-9 iter 1). Print forces the curtain
 * open and hides the edges via the @media print rule in globals.css.
 *
 * `data-curtain-progress` on the wrapper is the verification probe:
 * the live scroll progress (0 = entering, 1 = leaving), so a probe
 * can pin the computed clip-path to the scroll position.
 */
"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  caseCurtainClipAt,
  caseCurtainEdgeOpacityAt,
  caseCurtainInsetAt,
  caseCurtainParallaxYAt,
} from "@/lib/case-curtain";

export function CaseCurtain({ children }: { readonly children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const clipPath = useTransform(scrollYProgress, (p) => caseCurtainClipAt(p));
  const y = useTransform(scrollYProgress, (p) => caseCurtainParallaxYAt(p));
  // The glowing leading edges ride the clip boundaries: the top lip
  // sits at the top inset, the bottom lip at the bottom inset, and
  // both fade out as the curtain completes so the settled figure is
  // clean. They are siblings of the drifting figure (not children of
  // it) so they track the clip, not the parallax.
  const edgeTop = useTransform(
    scrollYProgress,
    (p) => `${caseCurtainInsetAt(p)}%`,
  );
  const edgeBottom = useTransform(
    scrollYProgress,
    (p) => `${caseCurtainInsetAt(p)}%`,
  );
  const edgeOpacity = useTransform(
    scrollYProgress,
    (p) => caseCurtainEdgeOpacityAt(p),
  );

  // Keep the probe attribute live: the change event fires on scroll,
  // the mount effect covers a figure that is already in view when its
  // panel opens (useScroll computes progress on mount without firing
  // a change for the initial value). Under reduced motion there is no
  // scroll linkage — the JSX value ("1", fully revealed) stands, so
  // both hooks stay out of the way there.
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (reduceMotion) return;
    ref.current?.setAttribute(
      "data-curtain-progress",
      value.toFixed(3),
    );
  });
  useEffect(() => {
    if (reduceMotion) return;
    ref.current?.setAttribute(
      "data-curtain-progress",
      scrollYProgress.get().toFixed(3),
    );
  }, [scrollYProgress, reduceMotion]);

  if (reduceMotion) {
    return (
      <div
        ref={ref}
        className="journey-case-curtain"
        data-case-curtain
        data-curtain-progress="1"
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className="journey-case-curtain"
      data-case-curtain
      data-curtain-progress="0"
      style={{ clipPath }}
    >
      <motion.div
        aria-hidden="true"
        className="journey-case-curtain-edge"
        data-case-curtain-edge="top"
        style={{ top: edgeTop, opacity: edgeOpacity }}
      />
      <motion.div
        aria-hidden="true"
        className="journey-case-curtain-edge"
        data-case-curtain-edge="bottom"
        style={{ bottom: edgeBottom, opacity: edgeOpacity }}
      />
      <motion.div
        className="journey-case-curtain-inner"
        data-case-curtain-figure
        style={{ y }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
