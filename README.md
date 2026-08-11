This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Theme bootstrap and strict CSP

`next-themes` is the only code that resolves and applies the pre-paint theme.
The small script rendered immediately before it only changes an unsupported
`localStorage.theme` value to `system`; it does not apply theme classes.

The current static Netlify build does not define a Content Security Policy. If a
strict `script-src` policy is added, choose one of these Next.js 16-compatible
approaches:

- Keep static rendering and allow hashes for both exact inline scripts emitted by
  `components/providers/theme-provider.tsx`. Regenerate the hashes after changing
  its props, the storage guard, or the `next-themes` version.
- Generate a fresh unpredictable nonce per request in `proxy.ts`, include it in
  the request CSP and `x-nonce` header, read that header in `app/layout.tsx`, and
  pass it to `<ThemeProvider nonce={nonce}>`. This opts the route into dynamic
  rendering, as documented in the installed Next.js guide at
  `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`.

Do not add another theme resolver or use a fixed nonce. Both the storage guard
and the `next-themes` resolver already receive the same `nonce` prop.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
