import { iconForTech } from "@/lib/tech-icons";

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
          <li key={technology} className="tech-pill">
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
  );
}
