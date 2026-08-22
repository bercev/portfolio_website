# Publication PDF Reader

## Understanding

- Replace each static publication hover image with a compact PDF reader.
- Keep the publication title as the canonical external-paper link.
- Keep the reader open while pointer or keyboard focus remains inside it.
- Allow native scrolling and zooming inside the preview without scrolling the page.
- Store both supplied PDFs locally so previews do not depend on third-party embeds.
- Preserve reduced-motion behavior and the existing visual treatment.

## Assumptions

- Desktop hover and keyboard focus are the primary preview interactions.
- Mobile users continue to open the canonical full-paper link.
- Native browser PDF rendering is sufficient and avoids a PDF.js dependency.
- PDFs are public research artifacts and require no authentication.

## Design

Add a local PDF path to each publication. The existing client-side hover preview
will render an iframe for that PDF, delayed briefly on pointer exit so users can
cross into the pane. The iframe receives pointer events and owns wheel scrolling.
The pane includes a short instruction and a canonical full-paper link.

## Decision Log

- Use local PDFs instead of remote embeds for reliability and privacy.
- Use the native browser PDF renderer instead of adding PDF.js.
- Preserve the canonical title link instead of turning the title into a toggle.
- Keep mobile behavior simple because hover previews are desktop-oriented.

## Verification

- Content tests require a PDF path for every publication.
- Browser tests verify hover visibility, iframe source, pane persistence, focus,
  and canonical destinations.
- Run focused tests, ESLint, and TypeScript before committing.
