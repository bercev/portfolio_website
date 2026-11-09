/**
 * The BibTeX block as a tear-off citation slip (run-9 RUN9-BIBTEX-SLIP).
 *
 * The paper pages' BibTeX was the only stock-looking element left on an
 * otherwise drafted page — a plain rounded bordered box with a "BibTeX" /
 * "Copy" header row. It is now a slip torn from the sheet: a punched-hole
 * perforation along the top edge, a dashed tear line that draws across on
 * first scroll into view, a mono "BIBTEX" kicker, and a stamped COPY plate
 * (accent border on hover and while copied, reel-4 0.97 press). The slip
 * itself settles from a slight tilt; the COPY label presses in on the
 * fold-tab timing. Copy semantics and the BibTeX text are verbatim
 * (clipboard write, 2s "Copied" reset, aria-live). Reduced motion renders
 * the slip settled from the first frame via the native hook (motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";

import {
  BIBTEX_SLIP_COPY_DELAY_S,
  BIBTEX_SLIP_PRESS_MS,
  BIBTEX_SLIP_RULE_DELAY_S,
  BIBTEX_SLIP_RULE_MS,
  BIBTEX_SLIP_TEAR_MS,
  bibtexSlipCopyLabel,
  bibtexSlipSettle,
} from "@/lib/bibtex-slip";
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
      className="bibtex-slip"
      initial={{ rotate: -1.2, y: 4, opacity: 0 }}
      animate={entered ? bibtexSlipSettle() : {}}
      transition={{
        duration: BIBTEX_SLIP_TEAR_MS / 1000,
        delay: 0.05,
        ease: SITE_EASE,
      }}
    >
      <div className="bibtex-slip-perf" aria-hidden="true">
        <motion.span
          className="bibtex-slip-tear"
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          animate={entered ? { scaleX: 1 } : {}}
          transition={{
            duration: BIBTEX_SLIP_RULE_MS / 1000,
            delay: BIBTEX_SLIP_RULE_DELAY_S,
            ease: SITE_EASE,
          }}
        />
      </div>
      <div className="bibtex-slip-head">
        <span className="bibtex-slip-kicker">BibTeX</span>
        <button
          type="button"
          onClick={copy}
          className="bibtex-slip-copy"
          data-copied={copied}
          aria-live="polite"
        >
          <motion.span
            className="bibtex-slip-copy-label"
            aria-hidden="true"
            initial={{ scale: 1.25, opacity: 0 }}
            animate={entered ? { scale: 1, opacity: 1 } : {}}
            transition={{
              duration: BIBTEX_SLIP_PRESS_MS / 1000,
              delay: BIBTEX_SLIP_COPY_DELAY_S,
              ease: SITE_EASE,
            }}
          >
            {bibtexSlipCopyLabel(copied)}
          </motion.span>
          <span className="sr-only">
            {copied ? "Copied to clipboard" : "Copy BibTeX to clipboard"}
          </span>
        </button>
      </div>
      <pre className="bibtex-slip-code">{bibtex}</pre>
    </motion.div>
  );
}
