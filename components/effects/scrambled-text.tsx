"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

function getScrambledFrame(
  text: string,
  chars: string,
  revealed: number,
  frame: number,
) {
  return [...text]
    .map((character, index) => {
      if (character === " " || index < revealed) return character;
      return chars[(index * 7 + frame * 3) % chars.length];
    })
    .join("");
}

export function ScrambledText({
  text,
  chars = "@#$%^",
  className,
}: {
  text: string;
  chars?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.7 });
  const reducedMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!inView || reducedMotion || chars.length === 0) return;

    let frame = 0;
    const interval = window.setInterval(() => {
      frame += 1;
      const revealed = Math.min(text.length, Math.floor(frame / 2));
      setDisplayText(getScrambledFrame(text, chars, revealed, frame));
      if (revealed >= text.length) window.clearInterval(interval);
    }, 34);

    return () => window.clearInterval(interval);
  }, [chars, inView, reducedMotion, text]);

  const renderedText = !inView || reducedMotion ? text : displayText;

  return (
    <span ref={ref} className={cn("relative inline-block", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{renderedText}</span>
    </span>
  );
}
