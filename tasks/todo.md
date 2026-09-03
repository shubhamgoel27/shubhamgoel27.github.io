# Fun batch: visual + features + eggs + personality

Approved items: 1, 2, 3, 4, 5, 7, 8, 10, 11

## Plan
- [ ] #3a Terracotta text-selection color (global.css)
- [ ] #1 Time-of-day hero sky, driven by real SF clock (index.astro)
- [ ] #10 Time-aware greeting by visitor local time (index.astro hero)
- [ ] #5 Idle-aware doodle: nods off after ~30s, Zzz, wakes on activity (HeroDoodle.astro)
- [ ] #2 Reading progress line on blog posts (BlogPost.astro)
- [ ] #3b Heading underlines that draw themselves on scroll (BlogPost.astro)
- [ ] #4 Blog polish: hover `#` anchor links on headings + prev/next posts (BlogPost.astro, [slug].astro)
- [ ] #7 + #11 "You finished" soft confetti + handwritten "— Shubham" sign-off at post end
- [ ] #8 New eggs: type `chai` (steam) and `gg` (ball rolls across), ambient, not tracked (Secrets.astro)

## Notes
- Reading time (#4) already shipped via utils/reading -> minutesRead.
- Homepage-only: #1, #10, #5 (doodle shows >=54rem).
- Blog-only: #2, #3b, #4, #7, #11. Global: #3a, #8.
- All motion reduced-motion-safe. Preview before pushing to prod.

## Review
All 9 built + verified (build clean). Verification notes:
- Automation tab runs HIDDEN, so IntersectionObserver + CSS transitions/animations
  are paused there. Confirmed the CSS/JS is correct by bypassing (e.g. .drawn -> scaleX(1)
  with transition off), but the *motion* of #3b underline, #5 Zzz, #7 confetti can only be
  eyeballed in a real (focused) browser.
- Verified visually: #1 sky glow, #10 "good afternoon" greeting, #2 progress bar (50/100%).
- Verified functionally: #4 anchors (11 ids+links, correct slugs) + prev/next link,
  #8 chai (steam+toast) / gg (rolling ball) + input-focus guard, #11 sign-off text/position.
- Screenshot tool drops viewport-pinned fixed overlays and crops the right column, so the
  doodle + some fixed bits can't be captured here; confirmed via DOM instead.
- Pending: user preview at localhost:4321, then push.
