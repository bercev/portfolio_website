"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

const TubesCursorCanvas = dynamic(
  () => import("./tubes-cursor").then((m) => m.TubesCursorCanvas),
  { ssr: false }
);

function subscribeDesktop(onStoreChange: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

export function LiquidBackground() {
  const reduced = useReducedMotion();
  const isDesktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => false);

  if (reduced || !isDesktop) return null;
  return <TubesCursorCanvas />;
}
