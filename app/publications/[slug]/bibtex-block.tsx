/**
 * The BibTeX block as a light-flow panel (run-10 RUN10-PAPERS).
 *
 * The paper pages' BibTeX stops being a tear-off slip — no perforation,
 * no dashed tear line, no tilt — and becomes a borderless panel lit from
 * above: a beam of accent light draws across the top edge on first
 * scroll into view, a mono "BibTeX" kicker, and a luminous COPY pill
 * (accent border on hover and while copied, reel-4 0.97 press). Copy
 * semantics and the BibTeX text are verbatim (clipboard write, 2s
 * "Copied" reset, aria-live). Reduced motion renders the panel settled
 * from the first frame via the native hook (motion's useReducedMotion()
 * is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";

import {
  BIBTEX_FLOW_BEAM_DELAY_S,
  BIBTEX_FLOW_BEAM_MS,
  BIBTEX_FLOW_COPY_DELAY_S,
  BIBTEX_FLOW_FADE_MS,
  BIBTEX_FLOW_PRESS_MS,
  bibtexFlowCopyLabel,
  bibtexFlowSettle,
} from "@/lib/bibtex-flow";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function BibtexBlock({ bibtex }: { bibtex: string }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  const entered = inView || reduceMotion;

  async function copy() {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <motion.div
      ref={ref}
      className="bibtex-flow"
      initial={
        reduceMotion ? bibtexFlowSettle() : { y: 8, opacity: 0 }
      }
      animate={entered ? bibtexFlowSettle() : {}}
      transition={{
        duration: BIBTEX_FLOW_FADE_MS / 1000,
        delay: 0.05,
        ease: SITE_EASE,
      }}
    >
      <motion.span
        className="bibtex-flow-beam"
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        animate={entered ? { scaleX: 1 } : {}}
        transition={{
          duration: reduceMotion ? 0 : BIBTEX_FLOW_BEAM_MS / 1000,
          delay: BIBTEX_FLOW_BEAM_DELAY_S,
          ease: SITE_EASE,
        }}
      />
      <div className="bibtex-flow-head">
        <span className="bibtex-flow-kicker">BibTeX</span>
        <button
          type="button"
          onClick={copy}
          className="bibtex-flow-copy"
          data-copied={copied}
          aria-live="polite"
        >
          <motion.span
            className="bibtex-flow-copy-label"
            aria-hidden="true"
            initial={{ scale: 1.25, opacity: 0 }}
            animate={entered ? { scale: 1, opacity: 1 } : {}}
            transition={{
              duration: reduceMotion ? 0 : BIBTEX_FLOW_PRESS_MS / 1000,
              delay: BIBTEX_FLOW_COPY_DELAY_S,
              ease: SITE_EASE,
            }}
          >
            {bibtexFlowCopyLabel(copied)}
          </motion.span>
          <span className="sr-only">
            {copied ? "Copied to clipboard" : "Copy BibTeX to clipboard"}
          </span>
        </button>
      </div>
      <pre className="bibtex-flow-code">{bibtex}</pre>
    </motion.div>
  );
}
