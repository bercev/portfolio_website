import type { SectionId } from "@/data/content";
import { cn } from "@/lib/utils";

type StationProps = {
  readonly id: SectionId;
  /** Numbered chapter on the journey, e.g. 2 for the About chapter. */
  readonly station: number;
  /** Short chapter label shown as the kicker, e.g. "Origin". */
  readonly kicker: string;
  /** One-line beat readable without opening overlays. */
  readonly beat?: string;
  readonly heading: string;
  readonly className?: string;
  readonly children: React.ReactNode;
};

export function Station({
  id,
  station,
  kicker,
  beat,
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
      <p className="journey-kicker">
        <span aria-hidden="true">{String(station).padStart(2, "0")}</span>
        <span aria-hidden="true">—</span>
        <span>{kicker}</span>
      </p>
      <h2 id={`${id}-heading`} className="journey-station-heading">
        {heading}
      </h2>
      {beat ? <p className="journey-beat">{beat}</p> : null}
      {children}
    </section>
  );
}
