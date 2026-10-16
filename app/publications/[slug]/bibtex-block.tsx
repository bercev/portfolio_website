"use client";

import { useState } from "react";

export function BibtexBlock({ bibtex }: { bibtex: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded border">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-widest opacity-70">
          BibTeX
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded border px-3 py-1 text-xs font-medium hover:underline"
          aria-live="polite"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
        {bibtex}
      </pre>
    </div>
  );
}
