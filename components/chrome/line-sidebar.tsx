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

type LineSidebarProps = {
  items: PortfolioContent["navigation"];
};

export function LineSidebar({ items }: LineSidebarProps) {
  const listRef = useRef<HTMLUListElement>(null);
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
    const list = listRef.current;
    if (!list) return;
    const bounds = list.getBoundingClientRect();
    const pointerY = event.clientY - bounds.top;

    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const center = item.offsetTop + item.offsetHeight / 2;
      const distance = Math.abs(pointerY - center);
      const progress = Math.max(0, 1 - distance / 100);
      targetsRef.current[index] = FALLOFF_CURVES.smooth(progress);
    });
    startLoop();
  };

  const handlePointerLeave = () => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  };

  useEffect(() => {
    runFrameRef.current = runFrame;
    startLoop();
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [runFrame, startLoop, activeIndex]);

  return (
    <nav
      aria-label="Line section navigation"
      data-line-sidebar
      className={styles.sidebar}
    >
      <ul
        ref={listRef}
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
            style={{ "--item-index": index } as CSSProperties}
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
              <span className={styles.index}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
