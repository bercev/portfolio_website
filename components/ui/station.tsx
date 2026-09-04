import type { SectionId } from "@/data/content";
import { cn } from "@/lib/utils";

type StationProps = {
  readonly id: SectionId;
  /** Numbered chapter on the journey, e.g. 2 for the About chapter. */
  readonly station: number;
  readonly heading: string;
  readonly className?: string;
  readonly children: React.ReactNode;
};

export function Station({
  id,
  station,
  heading,
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
      <p className="journey-kicker">{String(station).padStart(2, "0")}</p>
      <h2 id={`${id}-heading`} className="journey-station-heading">
        {heading}
      </h2>
      {children}
    </section>
  );
}
