import { iconForTech, techInitials } from "@/lib/tech-icons";

export function TechPills({
  technologies,
}: {
  readonly technologies: readonly string[];
}) {
  return (
    <ul className="tech-pills" aria-label="Stack">
      {technologies.map((technology) => {
        const icon = iconForTech(technology);
        return (
          <li key={technology} className="tech-pill" title={technology}>
            {icon ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="tech-pill-icon"
              >
                <path fill="currentColor" d={icon.path} />
              </svg>
            ) : (
              <span className="tech-pill-mark" aria-hidden="true">
                {techInitials(technology)}
              </span>
            )}
            <span className="sr-only">{technology}</span>
          </li>
        );
      })}
    </ul>
  );
}
