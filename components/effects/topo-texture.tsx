import { buildTopoPaths, TOPO_VIEWBOX } from "@/lib/topo-contours";

/**
 * Static topographic contour texture for the footer band (RUN8-STYLE-TOPO,
 * reel 7 #14). One SVG path per contour level, drawn from live theme tokens
 * at low contrast, sitting behind the footer content. The paths are computed
 * once at module load from a fixed seed, so the map is identical on the
 * server and in the browser and never animates — reduced motion renders the
 * same frame by construction. Decorative: hidden from assistive tech, never
 * takes the pointer.
 */
const LEVELS = buildTopoPaths(0x746f706f);

export function TopoTexture() {
  return (
    <svg
      viewBox={`0 0 ${TOPO_VIEWBOX.w} ${TOPO_VIEWBOX.h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className="journey-topo-texture"
    >
      {LEVELS.map((level, i) => (
        <path
          key={i}
          d={level.d}
          data-index={level.index ? true : undefined}
        />
      ))}
    </svg>
  );
}
