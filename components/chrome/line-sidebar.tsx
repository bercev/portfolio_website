"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import type { PortfolioContent } from "@/data/content";
import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import {
  CHAPTER_IDS,
  RAIL_BEAM_BASE,
  railBeamLength,
  resolveChapterIndex,
  scrollSnapshot,
  subscribeScrollSnapshot,
} from "@/lib/scroll-fx";

import styles from "./line-sidebar.module.css";

const FALLOFF_CURVES = {
  linear: (progress: number) => progress,
  smooth: (progress: number) => progress * progress * (3 - 2 * progress),
  sharp: (progress: number) => progress * progress * progress,
} as const;

const ACTIVATION_LINE = 0.35;
const SLOT_MIN_GAP = 0.08;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Place each label at the same rail progress the traveler uses when that
 * section sits at the top of the viewport (hash jumps and native scroll).
 */
function measureSectionSlots(ids: readonly string[]): number[] {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const last = ids.length - 1;
  const raw = ids.map((id, index) => {
    if (index === 0) return 0;
    if (max <= 0) return last > 0 ? index / last : 0;
    const section = document.getElementById(id);
    if (!section) return last > 0 ? index / last : 0;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const scrollMargin = Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    return clamp01((top - scrollMargin) / max);
  });
  return spreadSlots(raw);
}

/** Keep labels from stacking when chapters sit close in the document. */
function spreadSlots(slots: readonly number[]): number[] {
  const n = slots.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const out = slots.map(clamp01);
  out[0] = 0;
  for (let i = 1; i < n; i++) {
    out[i] = Math.max(out[i], out[i - 1] + SLOT_MIN_GAP);
  }
  out[n - 1] = Math.min(1, out[n - 1]);
  for (let i = n - 2; i >= 0; i--) {
    out[i] = Math.min(out[i], out[i + 1] - SLOT_MIN_GAP);
  }
  out[0] = 0;
  return out.map(clamp01);
}

type LineSidebarProps = {
  items: PortfolioContent["navigation"];
  /** Pinned utility link (resume download) below the chapter rail. */
  resumeHref?: string;
};

export function LineSidebar({ items, resumeHref }: LineSidebarProps) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const runFrameRef = useRef<(now: number) => void>(() => undefined);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Rail-beam continuation loop (run-2 iter 43 fix): the beam length
  // is written on scroll events, but the snapshot velocity decays on
  // the publisher's own rAF loop with no further scroll event — after
  // an instant jump the beam would stick stretched until the next
  // scroll. So a scroll event starts this loop, which keeps rewriting
  // the length from the live snapshot until it lands exactly on the
  // base length, then stops (no permanent rAF at rest).
  const beamFrameRef = useRef<number | null>(null);
  // Scroll state source (run-2 iter 20): the shared snapshot publisher
  // in full-motion — one scroll sample per frame for the rail, the
  // field, the bust and the marquee. Under prefers-reduced-motion the
  // rail keeps its direct sampling (today's behavior, zero publisher
  // rAF cost).
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches;

  const runFrame = useCallback((now: number) => {
    const delta = Math.min((now - lastFrameRef.current) / 1000, 0.05);
    lastFrameRef.current = now;
    const easing = 1 - Math.exp(-delta / 0.1);
    let isMoving = false;

    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const target = Math.max(
        targetsRef.current[index] ?? 0,
        activeIndexRef.current === index ? 1 : 0,
      );
      const current = currentRef.current[index] ?? 0;
      const next = current + (target - current) * easing;
      const settled = Math.abs(target - next) < 0.0015;
      currentRef.current[index] = settled ? target : next;
      item.style.setProperty("--effect", String(currentRef.current[index]));
      if (!settled) isMoving = true;
    });

    frameRef.current = isMoving
      ? requestAnimationFrame(runFrameRef.current)
      : null;
  }, []);

  const startLoop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    lastFrameRef.current = performance.now();
    frameRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const startBeamLoop = useCallback(() => {
    if (beamFrameRef.current !== null) return;
    const tick = () => {
      const len = reduceMotion
        ? RAIL_BEAM_BASE
        : railBeamLength(scrollSnapshot.velocity);
      navRef.current?.style.setProperty("--beam-len", String(len));
      // railBeamLength returns exactly the base below the deadband,
      // so this terminates: no loop runs at rest.
      beamFrameRef.current =
        len === RAIL_BEAM_BASE ? null : requestAnimationFrame(tick);
    };
    beamFrameRef.current = requestAnimationFrame(tick);
  }, [reduceMotion]);

  const handlePointerMove = (event: PointerEvent<HTMLUListElement>) => {
    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const bounds = item.getBoundingClientRect();
      const center = bounds.top + bounds.height / 2;
      const distance = Math.abs(event.clientY - center);
      const progress = Math.max(0, 1 - distance / 100);
      targetsRef.current[index] = FALLOFF_CURVES.smooth(progress);
    });
    startLoop();
  };

  const handlePointerLeave = () => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  };

  const updateActiveSection = useCallback(() => {
    const vh = window.innerHeight;
    const activationLine = vh * ACTIVATION_LINE;
    // The rail keeps its own deliberate 35% activation line (commit
    // 6179062) — only the tops source changes: the shared snapshot's
    // document-relative tops in full-motion (no per-consumer layout
    // reads, no multi-tick disagreement), direct reads under RM.
    const snap = reduceMotion ? null : scrollSnapshot;
    const y = snap
      ? snap.y
      : Number.isFinite(window.scrollY)
        ? window.scrollY
        : 0;
    const docTop = (id: string): number => {
      if (snap) {
        const ti = CHAPTER_IDS.indexOf(id as (typeof CHAPTER_IDS)[number]);
        return ti >= 0 ? snap.tops[ti] : Number.POSITIVE_INFINITY;
      }
      const el = document.getElementById(id);
      return el
        ? el.getBoundingClientRect().top + window.scrollY
        : Number.POSITIVE_INFINITY;
    };

    const nextIndex = resolveChapterIndex(
      items.map((item) => {
        const t = docTop(item.id);
        return Number.isFinite(t) ? t - y : Number.POSITIVE_INFINITY;
      }),
      activationLine,
    );

    const documentHeight = document.documentElement.scrollHeight;
    const atBottom = y + vh >= documentHeight - 2;
    const resolved = atBottom ? items.length - 1 : nextIndex;

    if (activeIndexRef.current === resolved) return;

    activeIndexRef.current = resolved;
    setActiveIndex(resolved);
    startLoop();
  }, [items, startLoop, reduceMotion]);

  useEffect(() => {
    let updateFrame: number | null = null;
    // Hold the shared scroll snapshot publisher (run-2 iter 20) in
    // full-motion; under reduced motion the rail keeps its direct
    // sampling and the publisher never starts for it.
    const releaseSnapshot = reduceMotion
      ? undefined
      : subscribeScrollSnapshot();

    const scheduleUpdate = () => {
      if (updateFrame !== null) return;

      updateFrame = requestAnimationFrame(() => {
        updateFrame = null;
        const progress = reduceMotion
          ? (() => {
              const max =
                document.documentElement.scrollHeight - window.innerHeight;
              const y = Number.isFinite(window.scrollY) ? window.scrollY : 0;
              return max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
            })()
          : scrollSnapshot.progress;
        navRef.current?.style.setProperty("--progress", String(progress));
        // Rail tracing beam (run-2 iter 43): start the continuation
        // loop, which writes the length from the live snapshot until
        // it settles exactly on the base length.
        startBeamLoop();
        const slots = measureSectionSlots(items.map((item) => item.id));
        itemRefs.current.forEach((item, index) => {
          item?.style.setProperty("--slot", String(slots[index] ?? 0));
        });
        updateActiveSection();
      });
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);

    return () => {
      releaseSnapshot?.();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      if (updateFrame !== null) cancelAnimationFrame(updateFrame);
      if (beamFrameRef.current !== null) {
        cancelAnimationFrame(beamFrameRef.current);
        beamFrameRef.current = null;
      }
    };
  }, [items, updateActiveSection, reduceMotion, startBeamLoop]);

  useEffect(() => {
    runFrameRef.current = runFrame;
    startLoop();
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [runFrame, startLoop, activeIndex]);

  return (
    <nav
      ref={navRef}
      aria-label="Line section navigation"
      data-line-sidebar
      className={styles.sidebar}
      style={
        {
          "--progress": 0,
          "--beam-len": RAIL_BEAM_BASE,
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className={styles.traveler} />
      {/* Always rendered: conditioning this on reduceMotion would make
        the client render differ from SSR (hydration mismatch under
        RM). It is hidden under reduced motion by CSS instead. */}
      <span aria-hidden="true" className={styles.beam} />
      <ul
        className={styles.list}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            className={styles.item}
            style={
              {
                "--slot":
                  items.length > 1 ? index / (items.length - 1) : 0,
              } as CSSProperties
            }
          >
            <span
              aria-hidden="true"
              data-line-sidebar-marker
              className={styles.marker}
            />
            <a
              href={`#${item.id}`}
              aria-current={activeIndex === index ? "location" : undefined}
              className={`cursor-target ${styles.link}`}
              onClick={() => {
                activeIndexRef.current = index;
                setActiveIndex(index);
                startLoop();
              }}
            >
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
      {resumeHref ? (
        <a
          href={resumeHref}
          download
          className={`cursor-target ${styles.utility}`}
          aria-label="Download resume (PDF)"
        >
          Resume <span aria-hidden="true">↓</span>
        </a>
      ) : null}
    </nav>
  );
}
