import { iconForTech } from "@/lib/tech-icons";

export function TechPills({
  technologies,
  marquee = false,
}: {
  readonly technologies: readonly string[];
  readonly marquee?: boolean;
}) {
  const loop = marquee ? [...technologies, ...technologies] : technologies;

  return (
    <div className={marquee ? "tech-pills-marquee" : undefined}>
      <ul className="tech-pills" aria-label="Stack">
        {loop.map((technology, index) => {
          const icon = iconForTech(technology);
          return (
            <li
              key={`${technology}-${index}`}
              className="tech-pill"
              aria-hidden={
                marquee && index >= technologies.length ? true : undefined
              }
            >
              {icon ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="tech-pill-icon"
                >
                  <path fill="currentColor" d={icon.path} />
                </svg>
              ) : null}
              <span>{technology}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
