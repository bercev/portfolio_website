"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { marqueeBoost, marqueeSkewDeg } from "@/lib/scroll-fx";
import { scrollSnapshot, subscribeScrollSnapshot } from "@/lib/scroll-fx";
import { useHydratedReducedMotion } from "@/lib/use-hydrated-reduced-motion";

type SkillGroup = {
  readonly category: string;
  readonly items: readonly { readonly name: string; readonly note: string }[];
};

// Base loop durations, seconds per 50% loop — byte-identical to the old CSS
// marquee (42s forward / 50s reverse), so the at-rest motion is unchanged.
const BASE_DURATION_S = { forward: 42, reverse: 50 } as const;
// Sign of the x-velocity in %/s: forward rows travel left (x decreasing).
const ROW_SENSE = { forward: -1, reverse: 1 } as const;

// Keep the translate inside one duplicated loop: (-50, 0]. The track holds
// two copies of the pill set, so translateX(-50%) === translateX(0).
function wrapLoop(pct: number): number {
  const w = pct % 50;
  return w > 0 ? w - 50 : w;
}

function SkillRow({
  groups,
  direction,
  scrollVel,
  inView,
  reduceMotion,
  label,
}: {
  readonly groups: readonly SkillGroup[];
  readonly direction: "forward" | "reverse";
  readonly scrollVel: MotionValue<number>;
  readonly inView: boolean;
  readonly reduceMotion: boolean;
  readonly label: string;
}) {
  const pills = groups.flatMap((group) =>
    group.items.map((item) => ({ item, category: group.category })),
  );
  const loop = [...pills, ...pills];

  // Scroll-velocity driver (run-2 iter 11, React Bits "Scroll Velocity"
  // pattern; velocity source unified in run-2 iter 20): the rows speed up
  // with scroll velocity and lean into the scroll direction, converging
  // to exactly the constant base rate at rest (marqueeBoost/marqueeSkewDeg
  // are literally 0 below the reading-speed deadband). The velocity is
  // the shared snapshot publisher's low-passed px/s — the same sample
  // the glyph field's warp reads — so the two velocity-driven surfaces
  // can no longer disagree during flings (iter-19 audit vector c). The
  // spring settles velocity to 0 when scrolling stops; the deadband
  // swallows any spring wobble.
  const baseX = useMotionValue(0);
  const velocity = useSpring(scrollVel, { stiffness: 260, damping: 60 });
  // Hover/focus pause eases 1 -> 0 over ~150ms (inside the <=200ms
  // feedback budget; the old CSS pause was instant). tabIndex stays:
  // focusing the row pauses the ticker = the WCAG 2.2.2 keyboard pause
  // mechanism for moving content — intentional, do not remove.
  const paused = useRef(false);
  const pauseAmt = useRef(1);

  useAnimationFrame((_, delta) => {
    // Battery discipline (iter-28 rAF rule): the marquee only advances
    // while the skills section is near the viewport.
    if (reduceMotion || !inView) return;
    // Feed the shared snapshot velocity into the spring's source (the
    // rows' own animation frame — no extra rAF loop for this).
    scrollVel.set(scrollSnapshot.velocity);
    const v = velocity.get();
    const target = paused.current ? 0 : 1;
    pauseAmt.current += (target - pauseAmt.current) * Math.min(1, delta / 150);
    if (Math.abs(pauseAmt.current - target) < 0.001) pauseAmt.current = target;
    const rate =
      ROW_SENSE[direction] *
      (50 / BASE_DURATION_S[direction]) *
      (1 + marqueeBoost(v)) *
      pauseAmt.current;
    baseX.set(wrapLoop(baseX.get() + (rate * delta) / 1000));
  });

  const x = useTransform(baseX, (v) => `${v}%`);
  const skewX = useTransform(velocity, (v) => `${marqueeSkewDeg(v)}deg`);

  if (pills.length === 0) {
    return null;
  }

  if (reduceMotion) {
    return (
      <div
        data-skills-row
        data-direction={direction}
        tabIndex={0}
        className="skill-marquee skill-marquee--static"
      >
        <ul className="skill-marquee-track" aria-label={label}>
          {loop.map((pill, index) => (
            <li
              key={`${pill.item.name}-${index}`}
              data-skill
              className="skill-pill"
              title={pill.item.note}
              aria-hidden={index >= pills.length ? true : undefined}
            >
              {pill.item.name}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      data-skills-row
      data-direction={direction}
      tabIndex={0}
      className="skill-marquee"
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
      onFocus={() => {
        paused.current = true;
      }}
      onBlur={() => {
        paused.current = false;
      }}
    >
      <motion.ul
        className="skill-marquee-track"
        aria-label={label}
        style={{ x, skewX }}
      >
        {loop.map((pill, index) => (
          <li
            key={`${pill.item.name}-${index}`}
            data-skill
            className="skill-pill"
            title={pill.item.note}
            aria-hidden={index >= pills.length ? true : undefined}
          >
            {pill.item.name}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

export function SkillMarquee({
  groups,
}: {
  readonly groups: readonly SkillGroup[];
}) {
  const reduceMotion = useHydratedReducedMotion();
  const rows = [groups.slice(0, 2), groups.slice(2)] as const;
  const stackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stackRef, { margin: "240px" });
  // Shared scroll velocity (run-2 iter 20): the snapshot publisher's
  // low-passed px/s, fed into each row's spring source on its own
  // animation frame. Subscribed only in full-motion; the reduced-motion
  // static variant never reads it.
  const scrollVel = useMotionValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    return subscribeScrollSnapshot();
  }, [reduceMotion]);

  return (
    <div className="skill-marquee-stack" data-skill-cluster ref={stackRef}>
      {rows.map((rowGroups, index) => (
        <div key={`row-${index}`} className="skill-marquee-row">
          <p className="journey-spec-label" aria-hidden="true">
            {rowGroups.map((group) => group.category).join(" · ")}
          </p>
          <SkillRow
            key={`${index}-${rowGroups.map((group) => group.category).join("-")}`}
            groups={rowGroups}
            direction={index === 0 ? "forward" : "reverse"}
            scrollVel={scrollVel}
            inView={inView}
            reduceMotion={reduceMotion}
            label={rowGroups.map((group) => group.category).join(", ")}
          />
        </div>
      ))}
    </div>
  );
}
