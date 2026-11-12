/**
 * Skill rings (run-10 RUN10-RINGS).
 *
 * One glowing light ring per skill group, above the ledger: the ring
 * draws on first scroll into view with a count-up in its center
 * (0 → N skills), then laps past 100% — the Kokonut
 * apple-activity-card language (read in full 2026-11-12, MIT v1.1.0;
 * rebuilt in our own stack, restyled to FROST, zero new dependencies).
 * The count is the group's real size from content.ts (7 / 5 / 4 / 2);
 * the "goal" is the group itself, so every ring closes a full lap and
 * overlaps the seam by SKILL_RING_LAP_OVER, drawn white-hot and led by
 * a white bead — the overlap must read in the settled state, not just
 * during the draw (round-1 critics: an accent-on-accent lap is
 * invisible once settled).
 *
 * Dim to focus, two ways: hovering/focusing a ring (or its track)
 * dims the other rings, and the ledger's active-skill highlight dims
 * every group but the one holding the skill. Reduced motion: the rings
 * render fully drawn with final counts, no animation (native hook —
 * motion's useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { animate, useInView } from "motion/react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

import type { PortfolioContent } from "@/data/content";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  SKILL_RING_CAP_R,
  SKILL_RING_EASE,
  SKILL_RING_PULSE_MS,
  SKILL_RING_SIZE,
  SKILL_RING_STAGGER_S,
  SKILL_RING_STROKE,
  skillRingBaseOffset,
  skillRingCircumference,
  skillRingCountAt,
  skillRingDimmed,
  skillRingDrawSeconds,
  skillRingLapOffset,
  skillRingLapRest,
  skillRingRadius,
  skillRingRatio,
} from "@/lib/skill-rings";

type RingNodes = {
  svg: SVGSVGElement | null;
  base: SVGCircleElement | null;
  lap: SVGCircleElement | null;
  cap: SVGGElement | null;
  pulse: SVGCircleElement | null;
  count: HTMLSpanElement | null;
};

/**
 * Write one frame of a ring's draw straight to the DOM: `p` is progress
 * in laps. Past the goal the first lap stays full and a second circle
 * draws the overflow on top of it, led by the end cap — the reference's
 * mechanism, with our own model underneath. Also writes the
 * `data-ring-progress` probe the verification scripts read.
 */
function paintRing(
  nodes: RingNodes,
  data: Pick<{ size: number; current: number }, "size" | "current">,
  p: number,
  ratio: number,
) {
  const circumference = skillRingCircumference(data.size);
  nodes.base?.setAttribute(
    "stroke-dashoffset",
    `${skillRingBaseOffset(p, circumference)}`,
  );
  const over = p > 1;
  if (nodes.lap) {
    nodes.lap.setAttribute(
      "stroke-dashoffset",
      `${skillRingLapOffset(p, circumference)}`,
    );
    nodes.lap.style.opacity = over ? "1" : "0";
  }
  if (nodes.cap) {
    nodes.cap.style.transform = `rotate(${skillRingLapRest(p) * 360}deg)`;
    nodes.cap.style.opacity = over ? "1" : "0";
  }
  if (nodes.svg) {
    nodes.svg.setAttribute("data-ring-progress", p.toFixed(3));
  }
  if (nodes.count) {
    // Count in step with the ring, landing exactly on the real value.
    nodes.count.textContent = `${skillRingCountAt(p, ratio, data.current)}`;
  }
}

function SkillRing({
  category,
  count,
  index,
  inView,
  reduceMotion,
  dimmed,
  onFocusGroup,
}: {
  readonly category: string;
  /** Real group size — the count-up's target. */
  readonly count: number;
  readonly index: number;
  readonly inView: boolean;
  readonly reduceMotion: boolean;
  readonly dimmed: boolean;
  readonly onFocusGroup: (index: number | null) => void;
}) {
  const size = SKILL_RING_SIZE;
  const stroke = SKILL_RING_STROKE;
  const radius = skillRingRadius(size, stroke);
  const circumference = skillRingCircumference(size, stroke);
  const center = size / 2;
  const ratio = skillRingRatio(count);
  const progressLabel = `${category}: ${count} skills`;

  const gradientId = useId();
  const nodes = useRef<RingNodes>({
    svg: null,
    base: null,
    lap: null,
    cap: null,
    pulse: null,
    count: null,
  });
  const countRef = useRef<HTMLSpanElement | null>(null);

  // Where the ring last stood, so new values carry on from there instead
  // of redrawing from empty. Null until the first draw.
  const shown = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) {
      return;
    }
    const ringNodes = { ...nodes.current, count: countRef.current };
    const ring = { size, current: count };
    if (reduceMotion || ratio === 0) {
      paintRing(ringNodes, ring, ratio, ratio);
      shown.current = ratio;
      return;
    }
    const from = shown.current;
    // First draw: start from zero right away, so the number doesn't show
    // its final value while the ring waits for its turn.
    if (from === null) {
      paintRing(ringNodes, ring, 0, ratio);
    }
    let pulsed = (from ?? 0) >= 1;
    const controls = animate(from ?? 0, ratio, {
      duration: skillRingDrawSeconds(ratio),
      delay: from === null ? index * SKILL_RING_STAGGER_S : 0,
      ease: [...SKILL_RING_EASE],
      onUpdate: (p) => {
        shown.current = p;
        paintRing(ringNodes, ring, p, ratio);
        // The goal is hit: the cap pulses once at the top of the ring.
        if (!pulsed && p >= 1) {
          pulsed = true;
          ringNodes.pulse?.animate(
            [
              { transform: "scale(1)", opacity: 0.6 },
              { transform: "scale(2.4)", opacity: 0 },
            ],
            { duration: SKILL_RING_PULSE_MS, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
          );
        }
      },
    });
    return () => controls.stop();
    // Keyed on the values, not the object: a parent re-rendering with
    // the same numbers in a fresh array must not restart the draw.
  }, [inView, reduceMotion, size, count, ratio, index]);

  return (
    <div
      className={["skill-ring", dimmed ? "skill-ring--dimmed" : ""]
        .filter(Boolean)
        .join(" ")}
      data-skill-ring
    >
      <div className="skill-ring-disc">
        {/* The ring is focusable so keyboard users get the same focus
            dimming as hover; it has no action of its own. */}
        <svg
          aria-label={progressLabel}
          className="skill-ring-svg"
          data-ring-progress="0"
          height={size}
          onBlur={() => onFocusGroup(null)}
          onFocus={() => onFocusGroup(index)}
          ref={(node) => {
            nodes.current.svg = node;
          }}
          role="img"
          style={
            {
              "--skill-ring-from":
                "color-mix(in srgb, var(--portfolio-accent) 60%, var(--foreground))",
              "--skill-ring-to": "var(--portfolio-accent)",
            } as CSSProperties
          }
          tabIndex={0}
          viewBox={`0 0 ${size} ${size}`}
          width={size}
        >
          <title>{progressLabel}</title>
          <defs>
            <linearGradient
              id={gradientId}
              x1="0%"
              x2="100%"
              y1="0%"
              y2="100%"
            >
              <stop offset="0%" style={{ stopColor: "var(--skill-ring-from)" }} />
              <stop offset="100%" style={{ stopColor: "var(--skill-ring-to)" }} />
            </linearGradient>
          </defs>

          {/* The track is the ring's hover target, so each ring only
              reacts over its own band. */}
          <circle
            className="skill-ring-track"
            cx={center}
            cy={center}
            fill="none"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") {
                onFocusGroup(index);
              }
            }}
            onPointerLeave={() => onFocusGroup(null)}
            pointerEvents="stroke"
            r={radius}
            strokeWidth={stroke}
          />
          <circle
            className="skill-ring-base"
            cx={center}
            cy={center}
            data-ring-base
            fill="none"
            pointerEvents="none"
            r={radius}
            ref={(node) => {
              nodes.current.base = node;
            }}
            stroke={`url(#${gradientId})`}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            strokeWidth={stroke}
          />
          {/* The overflow lap is white-hot, not accent: it is drawn ON
              TOP of the base ring, so the same accent twice is invisible
              (round-1 critics: the settled ring read as a plain uniform
              circle). White reads over the accent ring in dark theme and
              over the deepened ring in light theme. */}
          <circle
            className="skill-ring-lap"
            cx={center}
            cy={center}
            data-ring-lap
            fill="none"
            pointerEvents="none"
            r={radius}
            ref={(node) => {
              nodes.current.lap = node;
            }}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            strokeWidth={stroke}
            style={{ opacity: 0 }}
          />
          {/* End cap of the overflow lap; it passes over the start of
              the ring as the lap closes. A bead, not a flush dot: r=8
              clears the 10px stroke on both sides (round-1 critics —
              the r=5 cap sat inside the stroke and was invisible). */}
          <g
            data-ring-cap
            pointerEvents="none"
            ref={(node) => {
              nodes.current.cap = node;
            }}
            style={{
              opacity: 0,
              transformBox: "view-box",
              transformOrigin: "center",
            }}
          >
            <circle
              className="skill-ring-cap-dot"
              cx={center + radius}
              cy={center}
              r={SKILL_RING_CAP_R}
            />
          </g>
          {/* Goal pulse, at the top of the ring where the first lap closes. */}
          <circle
            cx={center + radius}
            cy={center}
            data-ring-pulse
            fill="none"
            pointerEvents="none"
            r={stroke / 2}
            ref={(node) => {
              nodes.current.pulse = node;
            }}
            strokeWidth={2}
            style={{
              opacity: 0,
              stroke: "var(--skill-ring-to)",
              transformBox: "fill-box",
              transformOrigin: "center",
            }}
          />
        </svg>
        <p className="skill-ring-count" aria-hidden="true">
          <span data-ring-count ref={countRef}>
            {count}
          </span>
          <span className="skill-ring-unit">skills</span>
        </p>
      </div>
      <p className="skill-ring-name" data-ring-name>
        {category}
      </p>
    </div>
  );
}

export function SkillRings({
  groups,
  activeGroup,
}: {
  readonly groups: PortfolioContent["skills"];
  /** The group holding the ledger's active skill, if any. */
  readonly activeGroup: number | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = usePrefersReducedMotion();
  const [focusGroup, setFocusGroup] = useState<number | null>(null);

  return (
    <div
      aria-label="Skills by category"
      className="skill-rings"
      data-skill-rings
      ref={ref}
      role="group"
    >
      {groups.map((group, index) => (
        <SkillRing
          category={group.category}
          count={group.items.length}
          dimmed={skillRingDimmed(activeGroup, focusGroup, index)}
          index={index}
          inView={inView}
          key={group.category}
          onFocusGroup={setFocusGroup}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  );
}
