import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — segment not found",
  robots: { index: false, follow: false },
};

/**
 * Branded 404 (research iter 33, ryanlidev "honest status codes" + "the site itself
 * is proof of craft"): the PHOSPHOR terminal voice, kept calm — one status line,
 * one plain sentence, two ways out. Server component: no journey/WebGL, no new
 * dependencies, renders inside the root layout (skip link + theme providers).
 */
export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="not-found">
      <h1 className="not-found-status">
        <span aria-hidden="true" className="not-found-prompt">
          ${" "}
        </span>
        404 — segment not found
      </h1>
      <p className="not-found-line">
        This address doesn&rsquo;t resolve to anything here.
      </p>
      <nav aria-label="Where to go from here" className="not-found-nav">
        <Link href="/" className="not-found-link">
          &larr; back home
        </Link>
        <Link href="/#contact" className="not-found-link">
          get in touch &rarr;
        </Link>
      </nav>
    </main>
  );
}
