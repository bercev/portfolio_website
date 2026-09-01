import type { SectionId } from "@/data/content";

type StationProps = {
  readonly id: SectionId;
  /** Numbered chapter on the journey, e.g. 2 for the About chapter. */
  readonly station: number;
  /** Short chapter label shown as the kicker, e.g. "Origin". */
  readonly kicker: string;
  readonly heading: string;
  readonly children: React.ReactNode;
};

export function Station({ id, station, kicker, heading, children }: StationProps) {
  return (
    <section
      id={id}
      data-journey-station
      aria-labelledby={`${id}-heading`}
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
    >
      <p className="journey-kicker">
        Station {String(station).padStart(2, "0")} — {kicker}
      </p>
      <h2 id={`${id}-heading`} className="journey-station-heading">
        {heading}
      </h2>
      {children}
    </section>
  );
}