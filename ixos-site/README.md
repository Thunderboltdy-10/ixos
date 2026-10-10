# Ixos site workspace

The Next.js site is one product in the Ixos monorepo. Run npm commands from the repository root so the local `@ixos/ixos-ui` and `@ixos/ui` packages resolve correctly.

```sh
npm ci
npm run dev --workspace ixos-site
npm run build --workspace ixos-site
npm run test:visual --workspace ixos-site
```

`src/app/` contains the main site and numbered design variants; `src/components/` contains shared site components; `src/landing/` contains the shared desktop demo surfaces. Legacy account URLs redirect to downloads. The site and desktop no longer require subscriptions or accounts. Optional contact-email configuration is described in `.env.example`; local env values must remain excluded from Git.

Earlier specifications and design notes are preserved in `../docs/archive/site/`. Loose retired source is under `../legacy/site/`. Current restoration evidence is under `../reports/restoration/`. Full product documentation and performance claims will be revised after the engine evaluations.
