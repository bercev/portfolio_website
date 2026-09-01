"use client";

import { useEffect, useState } from "react";

export function ContentFrost() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("home");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
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
