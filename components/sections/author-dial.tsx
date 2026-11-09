/**
 * Author-position dial (run-9 RUN9-AUTHOR-DIALS, 60fps #2134 Runmo
 * Distance Wheel Fill): a radial gauge at the right end of a publication
 * plate's meta row showing Berat's real author position — 5th of 9 on
 * SkillOptimizer, 2nd of 8 on @GrokSet, read from content.ts.
 *
 * The ring carries one tick per author (his tick in accent); the arc
 * sweeps position/total of the ring on first view; the centre number
 * rolls digit-by-digit (RUN9-ROLLING-DIGITS as the number engine);
 * hovering the dial crossfades the number to its ordinal (5TH / 2ND).
 * Reduced motion: settled arc + static digits from the first frame
 * (native hook — motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1). The dial renders nothing when he is not listed.
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import type { CSSProperties } from "react";

import type { Publication } from "@/data/content";
import {
  AUTHOR_DIAL_CIRCUMFERENCE,
  AUTHOR_DIAL_RADIUS,
  AUTHOR_DIAL_SIZE,
  AUTHOR_DIAL_SWEEP_MS,
  AUTHOR_DIAL_DIGIT_MS,
  authorDialDashOffset,
  authorDialDelay,
  authorDialDigitDelay,
  authorDialFraction,
  authorDialPad,
  authorDialPosition,
  authorDialTickAngle,
  authorOrdinal,
  rollingDigitOffset,
} from "@/lib/author-dial";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CENTER = AUTHOR_DIAL_SIZE / 2;
const TICK_INNER = AUTHOR_DIAL_RADIUS + 2.5;
const TICK_OUTER = AUTHOR_DIAL_SIZE / 2 - 2;
const SELF_TICK_INNER = AUTHOR_DIAL_RADIUS + 1.5;

function tickPoint(angleDeg: number, radius: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(angle),
    y: CENTER - radius * Math.cos(angle),
  };
}

function RollingDigit({
  digit,
  index,
  plateIndex,
  entered,
  reduceMotion,
}: {
  readonly digit: number;
  readonly index: number;
  readonly plateIndex: number;
  readonly entered: boolean;
  readonly reduceMotion: boolean;
}) {
  const target = rollingDigitOffset(digit);
  return (
    <span className="author-dial-digit" aria-hidden="true">
      <motion.span
        className="author-dial-digit-column"
        initial={{ y: reduceMotion ? target : "0em" }}
        animate={{ y: entered || reduceMotion ? target : "0em" }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: AUTHOR_DIAL_DIGIT_MS / 1000,
                delay: authorDialDigitDelay(plateIndex, index),
                ease: SITE_EASE,
              }
        }
      >
        {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <span key={d} className="author-dial-digit-cell">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export function AuthorDial({
  authors,
  index,
}: {
  readonly authors: readonly Publication["authors"][number][];
  readonly index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = usePrefersReducedMotion();
  const position = authorDialPosition(authors);
  if (!position) return null;
  const { position: slot, total } = position;
  const fraction = authorDialFraction(slot, total);
  const settledOffset = authorDialDashOffset(
    AUTHOR_DIAL_CIRCUMFERENCE,
    fraction,
    1,
  );
  const entered = inView || reduceMotion;
  const padded = authorDialPad(slot);
  const digits = padded.split("").map(Number);

  return (
    <div
      ref={ref}
      className="author-dial"
      data-author-dial
      data-author-position={slot}
      data-author-total={total}
      role="img"
      aria-label={`Author position: Berat Ercevik, ${authorOrdinal(slot).toLowerCase()} of ${total} authors`}
      style={
        {
          "--author-dial-settled": `${settledOffset}px`,
        } as CSSProperties
      }
    >
      <div className="author-dial-face">
        <svg
          className="author-dial-ring"
          width={AUTHOR_DIAL_SIZE}
          height={AUTHOR_DIAL_SIZE}
          viewBox={`0 0 ${AUTHOR_DIAL_SIZE} ${AUTHOR_DIAL_SIZE}`}
          aria-hidden="true"
        >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={AUTHOR_DIAL_RADIUS}
          className="author-dial-track"
        />
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={AUTHOR_DIAL_RADIUS}
            className="author-dial-arc"
            strokeDasharray={AUTHOR_DIAL_CIRCUMFERENCE}
            initial={{ strokeDashoffset: reduceMotion ? settledOffset : AUTHOR_DIAL_CIRCUMFERENCE }}
            animate={{
              strokeDashoffset: entered || reduceMotion ? settledOffset : AUTHOR_DIAL_CIRCUMFERENCE,
            }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: AUTHOR_DIAL_SWEEP_MS / 1000,
                    delay: authorDialDelay(index),
                    ease: SITE_EASE,
                  }
            }
          />
        </g>
        <motion.g
          className="author-dial-ticks"
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: entered || reduceMotion ? 1 : 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.4, delay: authorDialDelay(index) + 0.2, ease: SITE_EASE }
          }
        >
          {Array.from({ length: total }, (_, i) => {
            const isSelf = i === slot - 1;
            const inner = tickPoint(
              authorDialTickAngle(i, total),
              isSelf ? SELF_TICK_INNER : TICK_INNER,
            );
            const outer = tickPoint(authorDialTickAngle(i, total), TICK_OUTER);
            return (
              <line
                key={i}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                className={
                  isSelf ? "author-dial-tick author-dial-tick--self" : "author-dial-tick"
                }
              />
            );
          })}
        </motion.g>
      </svg>
      <div className="author-dial-center" aria-hidden="true">
        <span className="author-dial-value">
          <span className="author-dial-num">
            {digits.map((digit, i) => (
              <RollingDigit
                key={i}
                digit={digit}
                index={i}
                plateIndex={index}
                entered={entered}
                reduceMotion={reduceMotion}
              />
            ))}
          </span>
          {/* Print fallback: the strips sit at 0 under print layout (no
              inView), so the settled number prints as plain text. */}
          <span className="author-dial-num-print">{padded}</span>
          <span className="author-dial-ord">{authorOrdinal(slot)}</span>
        </span>
        <span className="author-dial-total">/ {authorDialPad(total)}</span>
        </div>
      </div>
      {/* The gauge's meaning, in plain mono — a bare "05 / 09" reads as
          a date or a count until hovered (desktop critic, round 1). */}
      <span className="author-dial-caption" aria-hidden="true">
        AUTHOR
      </span>
    </div>
  );
}
