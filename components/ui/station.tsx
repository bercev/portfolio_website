import type { SectionId } from "@/data/content";

import { WarpText } from "@/components/effects/warp-text";
import { cn } from "@/lib/utils";

type StationProps = {
  readonly id: SectionId;
  readonly heading: string;
  /** Scannable fact pinned to the right edge of the masthead. */
  readonly note?: string;
  readonly className?: string;
  readonly children: React.ReactNode;
};

export function Station({
  id,
  heading,
  note,
  className,
  children,
}: StationProps) {
  return (
    <section
      id={id}
      data-journey-station
      data-light-chapter={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "relative scroll-mt-[calc(4rem+env(safe-area-inset-top))]",
        className,
      )}
    >
      <header className="journey-station-head">
        {note ? <p className="journey-station-note">{note}</p> : null}
        <h2 id={`${id}-heading`} className="journey-station-heading">
          <WarpText text={heading} />
        </h2>
      </header>
      {children}
    </section>
  );
}
