# Motion batch 2 + SEO / agent visibility

## Motion (approved: 1, 2, 3, 6)
- [x] 1 Theme toggle: circular wipe from the button (View Transitions API), scoped so it doesn't fight Astro's page transitions or the title morph
- [x] 2 Image zoom: post images grow into a fullscreen view and shrink back (shared view-transition name)
- [x] 3 Nav indicator: active underline glides between nav items across page changes
- [x] 6 Highlighter swipe: `<mark>` phrases in posts get a marker stroke that sweeps in on scroll (full highlight with JS off)

## SEO / agents
- [x] BlogPosting JSON-LD + article:published_time on every post (via a head slot in Base)
- [x] WebSite JSON-LD alongside Person on the homepage; rel="me" identity links
- [x] Markdown twin of every post at /blog/<slug>.md, advertised with rel="alternate" type="text/markdown"
- [x] llms.txt generated from the content collections (never goes stale) + llms-full.txt with full post text
- [x] robots.txt: explicit allow for AI crawlers, pointer to llms.txt
- [x] Verify: build, JSON-LD parses, .md and llms files serve, headless render of motion

## Needs user
- Employment line: Pinterest offer accepted; site/llms still say "interviewing / open to roles". Announce or stay neutral?
- Off-site: Google Search Console + Bing Webmaster sitemap submit, Cloudflare AI-bot blocking setting

## Review
All built and verified on a local preview. Motion: theme wipe flips and cleans up its class; zoom opens/closes and clears the
shared name; nav indicator carries `nav-indicator`; marks render as a soft wash (headless screenshot). SEO: Person+WebSite and
BlogPosting JSON-LD parse; article:* meta + rel=alternate markdown present; llms.txt / llms-full.txt / blog/*.md generated from
collections; sitemap excludes the text twins and now lists /chandni-bros/. Actual motion must be eyeballed in a visible tab.
