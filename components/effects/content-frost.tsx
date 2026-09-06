"use client";

import { useEffect, useState } from "react";

export function ContentFrost() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const about = document.getElementById("about");
    if (!about) return;

    const update = () => {
      // Hero is 100dvh, so About's top sits on the fold at load and a 0-threshold
      // observer can fire true. Turn frost on only once About reaches the viewport.
      setIsVisible(about.getBoundingClientRect().top <= 96);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
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
