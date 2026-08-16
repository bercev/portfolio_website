"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

import styles from "./target-cursor.module.css";

const HIDE_CURSOR_CLASS = "target-cursor-hide-default";

type CornerPosition = { x: number; y: number };

export type TargetCursorProps = {
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  parallaxOn?: boolean;
  cursorColor?: string;
  cursorColorOnTarget?: string;
};

function getContainingBlock(element: HTMLElement | null) {
  let node = element?.parentElement ?? null;

  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (
      style.transform !== "none" ||
      style.perspective !== "none" ||
      style.filter !== "none" ||
      style.willChange.includes("transform") ||
      style.willChange.includes("perspective") ||
      style.willChange.includes("filter") ||
      /paint|layout|strict|content/.test(style.contain)
    ) {
      return node;
    }
    node = node.parentElement;
  }

  return null;
}

function getContainingBlockOffset(block: HTMLElement | null) {
  if (!block) return { x: 0, y: 0 };
  const rect = block.getBoundingClientRect();
  return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
}

export function TargetCursor({
  targetSelector = ".cursor-target",
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true,
  cursorColor = "#ffffff",
  cursorColorOnTarget,
}: TargetCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<HTMLDivElement[]>([]);
  const spinTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const containingBlockRef = useRef<HTMLElement | null>(null);
  const targetCornerPositionsRef = useRef<CornerPosition[] | null>(null);
  const tickerRef = useRef<(() => void) | null>(null);
  const activeStrengthRef = useRef({ current: 0 });

  const constants = useMemo(() => ({ borderWidth: 3, cornerSize: 12 }), []);

  const moveCursor = useCallback((x: number, y: number) => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const offset = getContainingBlockOffset(containingBlockRef.current);
    gsap.to(cursor, {
      x: x - offset.x,
      y: y - offset.y,
      duration: 0.1,
      ease: "power3.out",
      overwrite: "auto",
    });
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const dot = dotRef.current;
    const activeStrength = activeStrengthRef.current;

    const originalBodyCursor = document.body.style.cursor;
    const hadHideCursorClass =
      document.documentElement.classList.contains(HIDE_CURSOR_CLASS);
    if (hideDefaultCursor) {
      document.body.style.cursor = "none";
      document.documentElement.classList.add(HIDE_CURSOR_CLASS);
    }

    cornersRef.current = Array.from(
      cursor.querySelectorAll<HTMLDivElement>("[data-target-cursor-corner]"),
    );
    containingBlockRef.current = getContainingBlock(cursor);

    let activeTarget: HTMLElement | null = null;
    let leaveHandler: (() => void) | null = null;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const getOffset = () =>
      getContainingBlockOffset(containingBlockRef.current);
    const setActive = (active: boolean) => {
      cursor.dataset.targetCursorActive = String(active);
    };
    const cleanupTarget = () => {
      if (activeTarget && leaveHandler) {
        activeTarget.removeEventListener("mouseleave", leaveHandler);
      }
      leaveHandler = null;
    };

    const initialOffset = getOffset();
    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2 - initialOffset.x,
      y: window.innerHeight / 2 - initialOffset.y,
    });

    const startSpin = () => {
      spinTimelineRef.current?.kill();
      spinTimelineRef.current = gsap
        .timeline({ repeat: -1 })
        .to(cursor, {
          rotation: "+=360",
          duration: spinDuration,
          ease: "none",
        });
    };
    startSpin();

    const ticker = () => {
      const positions = targetCornerPositionsRef.current;
      const strength = activeStrength.current;
      if (!positions || strength === 0) return;

      const cursorX = Number(gsap.getProperty(cursor, "x"));
      const cursorY = Number(gsap.getProperty(cursor, "y"));
      cornersRef.current.forEach((corner, index) => {
        const targetX = positions[index].x - cursorX;
        const targetY = positions[index].y - cursorY;
        const currentX = Number(gsap.getProperty(corner, "x"));
        const currentY = Number(gsap.getProperty(corner, "y"));
        const duration =
          strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05;

        gsap.to(corner, {
          x: currentX + (targetX - currentX) * strength,
          y: currentY + (targetY - currentY) * strength,
          duration,
          ease: duration === 0 ? "none" : "power1.out",
          overwrite: "auto",
        });
      });
    };
    tickerRef.current = ticker;

    const handleMouseMove = (event: MouseEvent) =>
      moveCursor(event.clientX, event.clientY);
    const handleMouseDown = () => {
      if (dot) gsap.to(dot, { scale: 0.7, duration: 0.3 });
      gsap.to(cursor, { scale: 0.9, duration: 0.2 });
    };
    const handleMouseUp = () => {
      if (dot) gsap.to(dot, { scale: 1, duration: 0.3 });
      gsap.to(cursor, { scale: 1, duration: 0.2 });
    };

    const handleMouseOver = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;
      const target = eventTarget.closest<HTMLElement>(targetSelector);
      if (!target || activeTarget === target) return;

      cleanupTarget();
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
      activeTarget = target;
      setActive(true);

      gsap.killTweensOf(cornersRef.current, "x,y");
      spinTimelineRef.current?.pause();
      gsap.set(cursor, { rotation: 0 });

      const targetColor = cursorColorOnTarget ?? cursorColor;
      gsap.to(cornersRef.current, {
        borderColor: targetColor,
        duration: 0.15,
        ease: "power2.out",
      });
      if (dot) {
        gsap.to(dot, {
          backgroundColor: targetColor,
          duration: 0.15,
          ease: "power2.out",
        });
      }

      const rect = target.getBoundingClientRect();
      const offset = getOffset();
      const { borderWidth, cornerSize } = constants;
      targetCornerPositionsRef.current = [
        {
          x: rect.left - borderWidth - offset.x,
          y: rect.top - borderWidth - offset.y,
        },
        {
          x: rect.right + borderWidth - cornerSize - offset.x,
          y: rect.top - borderWidth - offset.y,
        },
        {
          x: rect.right + borderWidth - cornerSize - offset.x,
          y: rect.bottom + borderWidth - cornerSize - offset.y,
        },
        {
          x: rect.left - borderWidth - offset.x,
          y: rect.bottom + borderWidth - cornerSize - offset.y,
        },
      ];

      gsap.ticker.add(ticker);
      gsap.to(activeStrength, {
        current: 1,
        duration: hoverDuration,
        ease: "power2.out",
      });

      leaveHandler = () => {
        gsap.ticker.remove(ticker);
        targetCornerPositionsRef.current = null;
        gsap.set(activeStrength, { current: 0, overwrite: true });
        setActive(false);

        gsap.to(cornersRef.current, {
          borderColor: cursorColor,
          duration: 0.15,
          ease: "power2.out",
        });
        if (dot) {
          gsap.to(dot, {
            backgroundColor: cursorColor,
            duration: 0.15,
            ease: "power2.out",
          });
        }

        const positions = [
          { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
          { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
          { x: cornerSize * 0.5, y: cornerSize * 0.5 },
          { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
        ];
        cornersRef.current.forEach((corner, index) => {
          gsap.to(corner, {
            ...positions[index],
            duration: 0.3,
            ease: "power3.out",
          });
        });

        cleanupTarget();
        activeTarget = null;
        resumeTimer = setTimeout(() => {
          if (!activeTarget) startSpin();
          resumeTimer = null;
        }, 50);
      };
      target.addEventListener("mouseleave", leaveHandler);
    };

    const handleScroll = () => {
      if (!activeTarget) return;
      const offset = getOffset();
      const mouseX = Number(gsap.getProperty(cursor, "x")) + offset.x;
      const mouseY = Number(gsap.getProperty(cursor, "y")) + offset.y;
      const element = document.elementFromPoint(mouseX, mouseY);
      if (
        !element ||
        (element !== activeTarget && element.closest(targetSelector) !== activeTarget)
      ) {
        leaveHandler?.();
      }
    };
    const handleResize = () => {
      containingBlockRef.current = getContainingBlock(cursor);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      if (tickerRef.current) gsap.ticker.remove(tickerRef.current);
      cleanupTarget();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      spinTimelineRef.current?.kill();
      gsap.killTweensOf([cursor, dot, ...cornersRef.current]);
      document.body.style.cursor = originalBodyCursor;
      if (hideDefaultCursor && !hadHideCursorClass) {
        document.documentElement.classList.remove(HIDE_CURSOR_CLASS);
      }
      targetCornerPositionsRef.current = null;
      activeStrength.current = 0;
    };
  }, [
    constants,
    cursorColor,
    cursorColorOnTarget,
    hideDefaultCursor,
    hoverDuration,
    moveCursor,
    parallaxOn,
    spinDuration,
    targetSelector,
  ]);

  return (
    <div
      ref={cursorRef}
      className={styles.wrapper}
      data-target-cursor
      data-target-cursor-active="false"
    >
      <div
        ref={dotRef}
        className={styles.dot}
        style={{ backgroundColor: cursorColor }}
      />
      <div
        className={cn(styles.corner, styles.topLeft)}
        data-target-cursor-corner
        style={{ borderColor: cursorColor }}
      />
      <div
        className={cn(styles.corner, styles.topRight)}
        data-target-cursor-corner
        style={{ borderColor: cursorColor }}
      />
      <div
        className={cn(styles.corner, styles.bottomRight)}
        data-target-cursor-corner
        style={{ borderColor: cursorColor }}
      />
      <div
        className={cn(styles.corner, styles.bottomLeft)}
        data-target-cursor-corner
        style={{ borderColor: cursorColor }}
      />
    </div>
  );
}
