"use client";

import { useEffect, useState } from "react";

export function ContentFrost() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const about = document.getElementById("about");
    if (!about) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Frost as soon as About enters, and keep it on after scrolling past
        // so Publications and later stations stay readable.
        setIsVisible(entry.isIntersecting || entry.boundingClientRect.top < 0);
      },
      {
        threshold: 0,
        rootMargin: "80px 0px 0px 0px",
      },
    );

    observer.observe(about);
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
