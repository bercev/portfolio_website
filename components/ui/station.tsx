import type { SectionId } from "@/data/content";
import { cn } from "@/lib/utils";

type StationProps = {
  readonly id: SectionId;
  /** Numbered chapter on the journey, e.g. 2 for the About chapter. */
  readonly station: number;
  readonly heading: string;
  /** Scannable fact pinned to the right edge of the masthead rule. */
  readonly note?: string;
  readonly className?: string;
  readonly children: React.ReactNode;
};

export function Station({
  id,
  station,
  heading,
  note,
  className,
  children,
}: StationProps) {
  return (
    <section
      id={id}
      data-journey-station
      aria-labelledby={`${id}-heading`}
      className={cn(
        "relative scroll-mt-[calc(4rem+env(safe-area-inset-top))]",
        className,
      )}
    >
      <header className="journey-station-head">
        <p className="journey-kicker">{station}</p>
        {note ? <p className="journey-station-note">{note}</p> : null}
        <h2 id={`${id}-heading`} className="journey-station-heading">
          {heading}
        </h2>
      </header>
      {children}
    </section>
  );
}
