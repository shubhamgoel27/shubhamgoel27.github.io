# shubhamgoel27.github.io

My personal site and blog. Built with [Astro](https://astro.build), a custom warm design
system, and a light/dark theme toggle.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # static build to dist/
npm run preview  # serve the production build
npm run check    # type-check
```

## Structure

- `src/pages/` — routes (home, about, building, now, blog, tags, rss).
- `src/data/projects.ts` — single source of truth for the Building page and home featured cards.
- `src/data/socials.ts` — social links.
- `src/content/blog/` — markdown posts (frontmatter: title, description, pubDate, tags, draft).
- `src/styles/tokens.css` — colors, type, spacing. `global.css` — base styles.

## Add a post

Drop a `.md` file in `src/content/blog/` with the required frontmatter. Set `draft: true` to keep
it out of the build. Reading time is computed automatically.

## Deploy

Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds with Astro and publishes
to GitHub Pages.
