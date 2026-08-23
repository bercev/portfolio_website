"use client";

import { useEffect, useState } from "react";

const HERO_FROST_THRESHOLD = 0.08;

export function ContentFrost() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("#home");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(
          !entry.isIntersecting ||
            entry.intersectionRatio <= HERO_FROST_THRESHOLD,
        );
      },
      { threshold: [0, HERO_FROST_THRESHOLD] },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden="true"
      className="content-frost"
      data-content-frost
      data-visible={isVisible ? "true" : "false"}
    />
  );
}
