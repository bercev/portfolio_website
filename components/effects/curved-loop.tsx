"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import "./curved-loop.css";

type CurvedLoopProps = {
  marqueeText?: string;
  speed?: number;
  className?: string;
  curveAmount?: number;
  direction?: "left" | "right";
  interactive?: boolean;
};

type SkillText = {
  category: string;
  items: readonly string[];
};

export function formatCurvedSkillText({ category, items }: SkillText) {
  return `${[category, ...items].join("  •  ")}  ✦`;
}

export function CurvedLoop({
  marqueeText = "",
  speed = 2,
  className,
  curveAmount = 400,
  direction = "left",
  interactive = true,
}: CurvedLoopProps) {
  const text = useMemo(() => {
    const trimmed = marqueeText.trimEnd();
    return `${trimmed}\u00a0`;
  }, [marqueeText]);
  const measureRef = useRef<SVGTextElement>(null);
  const textPathRef = useRef<SVGTextPathElement>(null);
  const [spacing, setSpacing] = useState(0);
  const uid = useId();
  const pathId = `curve-${uid}`;
  const pathD = `M-100,40 Q720,${40 + curveAmount} 1540,40`;
  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const directionRef = useRef(direction);

  const totalText = spacing
    ? Array(Math.ceil(1800 / spacing) + 2)
        .fill(text)
        .join("")
    : text;

  useEffect(() => {
    if (measureRef.current) {
      setSpacing(measureRef.current.getComputedTextLength());
    }
  }, [text, className]);

  useEffect(() => {
    if (!spacing || !textPathRef.current) return;
    textPathRef.current.setAttribute("startOffset", `${-spacing}px`);
  }, [spacing]);

  useEffect(() => {
    if (!spacing || speed === 0) return;
    let frame = 0;

    const step = () => {
      if (!dragRef.current && textPathRef.current) {
        const delta = directionRef.current === "right" ? speed : -speed;
        const currentOffset = Number.parseFloat(
          textPathRef.current.getAttribute("startOffset") ?? "0",
        );
        let nextOffset = currentOffset + delta;
        if (nextOffset <= -spacing) nextOffset += spacing;
        if (nextOffset > 0) nextOffset -= spacing;
        textPathRef.current.setAttribute("startOffset", `${nextOffset}px`);
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    dragRef.current = true;
    lastXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !dragRef.current || !textPathRef.current) return;
    const delta = event.clientX - lastXRef.current;
    lastXRef.current = event.clientX;
    const currentOffset = Number.parseFloat(
      textPathRef.current.getAttribute("startOffset") ?? "0",
    );
    let nextOffset = currentOffset + delta;
    if (nextOffset <= -spacing) nextOffset += spacing;
    if (nextOffset > 0) nextOffset -= spacing;
    textPathRef.current.setAttribute("startOffset", `${nextOffset}px`);
  };

  const endDrag = () => {
    if (!interactive) return;
    dragRef.current = false;
    directionRef.current = lastXRef.current > 0 ? "right" : direction;
  };

  return (
    <div
      className="curved-loop-jacket"
      style={{ visibility: spacing > 0 ? "visible" : "hidden" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      aria-hidden="true"
    >
      <svg className="curved-loop-svg" viewBox="0 0 1440 120">
        <text ref={measureRef} className={className}>
          {text}
        </text>
        <defs>
          <path id={pathId} d={pathD} fill="none" stroke="transparent" />
        </defs>
        {spacing > 0 ? (
          <text className={className}>
            <textPath
              ref={textPathRef}
              href={`#${pathId}`}
              startOffset={`${-spacing}px`}
              xmlSpace="preserve"
            >
              {totalText}
            </textPath>
          </text>
        ) : null}
      </svg>
    </div>
  );
}
