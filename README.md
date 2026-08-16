# Berat Ercevik — Portfolio

A one-page portfolio built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, Motion, and Playwright. The site includes system-aware light and dark themes, responsive visual effects, publication previews, and deterministic visual-regression coverage.

## Prerequisites

- Node.js 22 (the version used by Netlify)
- npm
- Chromium for Playwright: `npx playwright install chromium`

## Install and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run lint       # ESLint
npm run test       # Vitest unit tests
npm run build      # Production Next.js build
npm run test:e2e   # Playwright browser and screenshot tests
npm run verify     # Lint, unit tests, build, then end-to-end tests
```

`npm run test:e2e` starts the production build on port 3100, so run `npm run build` first when invoking the end-to-end suite by itself. `npm run verify` already runs the commands in the required order.

## Edit portfolio content

Section and body copy, navigation labels, portfolio records, and shared external/file destinations live in [`data/content.ts`](data/content.ts). Edit the exported `portfolio` object for those values; its `satisfies PortfolioContent` check keeps section data, preview metadata, links, and navigation IDs type-safe.

Identity text is not fully centralized. When changing the name, role, or public positioning, review all of these locations together:

- Update the page-facing identity, section content, and shared destinations in `data/content.ts`.
- Update the header home link's accessibility label and visible initials in [`components/chrome/site-header.tsx`](components/chrome/site-header.tsx).
- Update the document title, description, application name, author/creator/publisher fields, and Open Graph/Twitter metadata in [`app/layout.tsx`](app/layout.tsx).

For other content edits:

- Keep navigation IDs aligned with their section IDs.
- Use site-relative paths such as `/resume.pdf` for files in `public/`.
- Include meaningful link labels and image alternative text.
- Run `npm run verify` after structural or content changes.

## Customize theme tokens and effects

The light theme tokens are in `:root` and dark overrides are in `.dark` in [`app/globals.css`](app/globals.css). Components consume these CSS variables through Tailwind's `@theme inline` mapping; they should not introduce hardcoded theme hex values.

The main customization points are:

- Base surface and text tokens: `--background`, `--foreground`, `--card`, `--muted`, `--border`, and related variables.
- Portfolio accent: `--portfolio-accent` and `--portfolio-accent-foreground`.
- Effect colors: `--effect-prismatic-primary`, `--effect-prismatic-secondary`, `--effect-cursor`, `--effect-spark`, and `--effect-glow`.
- Effect layering: the `--z-*` variables.

Effect capability policy is centralized in [`lib/effect-policy.ts`](lib/effect-policy.ts): reduced-motion users receive a static profile, mobile or coarse-pointer devices receive a throttled profile, and fine-pointer desktop devices receive the enhanced profile. The GSAP-powered Target Cursor is configured in [`components/effects/effect-stage.tsx`](components/effects/effect-stage.tsx), and meaningful interactive elements opt in with the `.cursor-target` class. Keep pointer effects gated by `(hover: hover) and (pointer: fine)` and preserve reduced-motion behavior.

## Replace publication placeholders

The current placeholder artwork is in `public/publications/`. To replace one with an authorized paper screenshot:

1. Add an optimized image to `public/publications/`, or replace the existing file in place.
2. Update that publication's `preview.src`, descriptive `preview.alt`, intrinsic `preview.width`, and intrinsic `preview.height` in `data/content.ts` if the path or dimensions changed.
3. Keep the typed `isPlaceholder` field while it remains part of the `Publication` interface; it is currently a schema marker and is not rendered.
4. Rebuild and update the approved screenshots as described below.

Do not publish an image unless you have permission to use it.

## Replace the public resume

`public/resume.pdf` is served at `/resume.pdf` and is referenced from `data/content.ts`. Replace that file only with a resume you are authorized to publish publicly. Keeping the same filename requires no code change; if the path changes, update the shared resume link in `data/content.ts`. Review the replacement for private or unintended information before deployment.

## Update visual-regression screenshots

Approved light and dark baselines live in `e2e/__screenshots__/chromium/`. The tests use reduced motion, wait for fonts and images, and disable animations before capture.

After an intentional visual change, update the baselines deterministically from the same OS, Node version, and Playwright browser version used for review:

```bash
npm run build
npm run test:e2e -- --update-snapshots
npm run test:e2e
```

Review every changed PNG before accepting it. Do not update snapshots merely to hide a regression. Playwright reports and test output are retained as review artifacts in this repository unless the user explicitly authorizes their removal.

## Deploy to Netlify

[`netlify.toml`](netlify.toml) pins Node.js 22 and runs `npm run build`. It intentionally has no `publish` setting: Netlify detects Next.js and deploys it through its supported OpenNext adapter rather than treating `.next` as a static publish directory.

To deploy:

1. Push the repository to the Git provider connected to Netlify.
2. Create or import the site in Netlify.
3. Allow framework detection to use `netlify.toml`; do not add a static publish directory.
4. Configure any future secrets in Netlify environment variables rather than committing `.env` files.
5. Deploy and verify the production light/dark themes, navigation, external links, publication links, and resume download.

Netlify's current Next.js guidance documents zero-configuration support through the OpenNext adapter: [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

## Theme bootstrap and strict CSP

`next-themes` is the only code that resolves and applies the pre-paint theme. The small script rendered immediately before it only changes an unsupported `localStorage.theme` value to `system`; it does not apply theme classes.

The current Netlify configuration does not define a Content Security Policy. If a strict `script-src` policy is added, choose one of these Next.js 16-compatible approaches:

- Keep static rendering and allow hashes for both exact inline scripts emitted by `components/providers/theme-provider.tsx`. Regenerate the hashes after changing its props, the storage guard, or the `next-themes` version.
- Generate a fresh unpredictable nonce per request in `proxy.ts`, include it in the request CSP and `x-nonce` header, read that header in `app/layout.tsx`, and pass it to `<ThemeProvider nonce={nonce}>`. This opts the route into dynamic rendering, as documented in the installed Next.js guide at `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`.

Do not add another theme resolver or use a fixed nonce. Both the storage guard and the `next-themes` resolver already receive the same `nonce` prop.

## Intentionally retained files

The unused create-next-app starter assets `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, and `public/window.svg` have no application source references. They remain intentionally preserved, along with temporary reports and test artifacts, because the current user directive prohibits deleting files or artifacts.
