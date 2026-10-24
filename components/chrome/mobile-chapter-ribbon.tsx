"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { PortfolioContent } from "@/data/content";
import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import {
  CHAPTER_IDS,
  resolveChapterIndex,
  scrollSnapshot,
  subscribeScrollSnapshot,
} from "@/lib/scroll-fx";

import styles from "./mobile-chapter-ribbon.module.css";

/**
 * The mobile extension of the line-sidebar rail (run-2 iter 46). The rail
 * is `display: none` below 900px, so a mobile visitor has zero chapter
 * orientation on a scroll-journey site. This is that same marker, moved
 * to the viewport where the rail cannot go: a hairline progress line +
 * the current chapter name, nothing else — no second nav, no icons, no
 * new chrome language, pointer-events none.
 *
 * Chapter resolution deliberately matches the rail, not the background
 * systems: the rail's 35% activation line over the shared snapshot's
 * tops, so the name a mobile visitor sees is the name the desktop rail
 * would show at the same scroll position. The background snapshot's own
 * chapterIndex uses a 45% line and would disagree at boundaries.
 */
const ACTIVATION_LINE = 0.35;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

type MobileChapterRibbonProps = {
  items: PortfolioContent["navigation"];
};

export function MobileChapterRibbon({ items }: MobileChapterRibbonProps) {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Same pattern as the rail: the shared snapshot publisher in
  // full-motion, direct sampling under prefers-reduced-motion (zero
  // publisher rAF cost there). Never conditionally rendered on this
  // value — SSR and the RM client render the same tree.
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches;

  const update = useCallback(() => {
    const vh = window.innerHeight;
    const activationLine = vh * ACTIVATION_LINE;
    // The rail keeps its own deliberate 35% activation line — only the
    // tops source changes: the shared snapshot's document-relative
    // tops in full-motion, direct reads under RM.
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

    const progress = reduceMotion
      ? (() => {
          const max =
            document.documentElement.scrollHeight - window.innerHeight;
          return max > 0 ? clamp01(y / max) : 0;
        })()
      : scrollSnapshot.progress;

    ribbonRef.current?.style.setProperty("--progress", String(progress));

    if (activeIndexRef.current === resolved) return;
    activeIndexRef.current = resolved;
    setActiveIndex(resolved);
  }, [items, reduceMotion]);

  useEffect(() => {
    let updateFrame: number | null = null;
    const releaseSnapshot = reduceMotion
      ? undefined
      : subscribeScrollSnapshot();

    const scheduleUpdate = () => {
      if (updateFrame !== null) return;
      updateFrame = requestAnimationFrame(() => {
        updateFrame = null;
        update();
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
    };
  }, [update, reduceMotion]);

  const active = items[activeIndex];

  return (
    <div
      ref={ribbonRef}
      aria-hidden="true"
      data-mobile-chapter-ribbon
      data-chapter-id={active?.id}
      className={styles.ribbon}
      style={{ "--progress": 0 } as CSSProperties}
    >
      <span aria-hidden="true" className={styles.track}>
        <span aria-hidden="true" className={styles.fill} />
      </span>
      <span className={styles.name}>{active?.label}</span>
    </div>
  );
}
