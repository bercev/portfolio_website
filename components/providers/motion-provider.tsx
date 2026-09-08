"use client";

import { MotionConfig } from "motion/react";
import {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
} from "react";

type MotionPreference = {
  readonly reducedMotion: boolean;
  readonly forced: boolean;
};

const MotionPreferenceContext = createContext<MotionPreference>({
  reducedMotion: false,
  forced: false,
});

export function useMotionPreference() {
  return useContext(MotionPreferenceContext);
}

export function MotionPreferenceProvider({
  forceReduce = false,
  children,
}: {
  forceReduce?: boolean;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    if (!forceReduce) return;
    const root = document.documentElement;
    root.dataset.motion = "reduce";
    return () => {
      delete root.dataset.motion;
    };
  }, [forceReduce]);

  return (
    <MotionPreferenceContext.Provider
      value={{ reducedMotion: forceReduce, forced: forceReduce }}
    >
      <MotionConfig reducedMotion={forceReduce ? "always" : "user"}>
        {children}
      </MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}
