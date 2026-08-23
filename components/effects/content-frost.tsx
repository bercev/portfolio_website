"use client";

import { useEffect, useState } from "react";

export function ContentFrost() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const heroText = document.querySelector("[data-hero-particle-text]");
    if (!heroText) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(heroText);
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
