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
};

export function LineSidebar({ items }: LineSidebarProps) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const runFrameRef = useRef<(now: number) => void>(() => undefined);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

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
    const activationLine = window.innerHeight * ACTIVATION_LINE;
    let nextIndex = 0;

    items.forEach((item, index) => {
      const sectionTop = document
        .getElementById(item.id)
        ?.getBoundingClientRect().top;
      if (sectionTop !== undefined && sectionTop <= activationLine) {
        nextIndex = index;
      }
    });

    const documentHeight = document.documentElement.scrollHeight;
    if (window.scrollY + window.innerHeight >= documentHeight - 2) {
      nextIndex = items.length - 1;
    }

    if (activeIndexRef.current === nextIndex) return;

    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    startLoop();
  }, [items, startLoop]);

  useEffect(() => {
    let updateFrame: number | null = null;

    const scheduleUpdate = () => {
      if (updateFrame !== null) return;

      updateFrame = requestAnimationFrame(() => {
        updateFrame = null;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const y = Number.isFinite(window.scrollY) ? window.scrollY : 0;
        const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        navRef.current?.style.setProperty("--progress", String(progress));
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
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      if (updateFrame !== null) cancelAnimationFrame(updateFrame);
    };
  }, [items, updateActiveSection]);

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
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className={styles.traveler} />
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
              <span className={styles.index}>{index + 1}</span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
