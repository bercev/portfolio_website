# Projects circular carousel

## Understanding

- Apply the supplied carousel idea only to the Projects section.
- Preserve the existing project content, links, and semantic headings.
- Keep `PortfolioCard` as the item surface so PixelCard and ChromaCard hover effects remain intact.
- Keep explicit `.cursor-target` behavior on cards, links, and controls.
- Avoid new image assets or external dependencies.
- Keep the change easy to revert in one focused commit.

## Assumptions

- Desktop may use depth and automatic movement when motion is allowed.
- Hover, keyboard focus, and direct navigation pause automatic movement.
- Mobile and reduced-motion layouts remain stable and horizontally scrollable.

## Decision log

- Use a bounded 3D coverflow instead of a full 360-degree ring because the portfolio currently has only two projects; a ring would spend much of its rotation showing card edges.
- Reuse `PortfolioCard` rather than restyling project content inside the gallery.
- Keep the client boundary in the reusable gallery so the Projects section remains server-rendered.
