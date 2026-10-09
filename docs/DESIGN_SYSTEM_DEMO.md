# Design exploration prototype

Temporary client-meeting prototype at `/work/design-system/`. It is a fictional presentation of how a portfolio story could be told. It is not a case study, not a client project, and not a replacement for the live site.

`noindex, nofollow` keeps the page out of the sitemap and asks crawlers not to index it. It does not make the page private. Anyone with the URL can open it.

## What was added

- `work/design-system/index.html`
- `work/design-system/design-system.css`
- `work/design-system/design-system.js`
- `work/design-system/media/*.svg` — original vector artwork made for this prototype. No external images, no client assets, and no third-party illustrations.
- A “Design System” link in the generated Work overview (`scripts/generate-work.mjs`, copied into `work/index.html` and styled from `assets/portfolio.css` into `work/portfolio.css`).
- Generator protection so `work/design-system/` is never deleted as a stale project.
- Reserved slug `design-system` in `scripts/validate-projects.mjs`.
- Checks in `scripts/check-published-output.mjs` and `scripts/check-homepage-fixtures.mjs`.
- Two short notes in `docs/PORTFOLIO_ARCHITECTURE.md`.

The link is not in the homepage navigation. The prototype has no Pages CMS record, does not change project status, and is not a Selected Work card.

## Creative reference

Observed on https://ramp.design/ in headless Chrome on 9 October 2026, after a short wait and one scroll: a light field, a large wordmark, navigation for Home, Work, Fun, Philosophy, Blog, and Apply now, then large rounded project cards. One card carried an illustrated badge. Another showed a budget graphic. The page also contained a canvas and several videos. The first paint in that session was mostly the wordmark; the card layout appeared after scrolling. Motion timing, easing curves, and hover detail were not measured, so they are not claimed as verified.

The essay at https://ramp.design/blog/behind-ramp-design (Elizabeth Lin, 10 September 2026) describes project-specific worlds, three questions (how a visit begins, what someone discovers, how they go deeper), and a shared card language that lets each project feel distinct.

This prototype uses those principles only: a full-viewport entry, scroll discovery, one fictional world, and purposeful motion. It does not copy Ramp’s wordmark, yellow pill, rounded white cards, illustrations, source, or composition. The visual system stays with Detailed Group: black, white, silver, square edges, and a copper accent that belongs only to the fictional FORM / 01 demonstration.

## Remove the prototype

1. Delete the directory `work/design-system/`.
2. In `scripts/generate-work.mjs`, remove `PROTECTED_WORK_DIRS`, the skip inside `removeStaleProjects`, the overwrite guard in `renderWorkSite`, and the Design System link. Restore the Work introduction so the consultation link, when present, is emitted without the `.cs-hero-actions` wrapper.
3. In `assets/portfolio.css`, remove `.cs-hero-actions` and `.ds-launch`.
4. In `scripts/validate-projects.mjs`, remove `design-system` from `RESERVED_SLUGS`.
5. In `scripts/check-published-output.mjs`, remove the protected-directory skip and the design-exploration assertions, including the real-name scan that applies only to this page.
6. In `scripts/check-homepage-fixtures.mjs`, remove the design-system survival fixture, the overview-link assertion, and the reserved-slug assertion added for this prototype.
7. In `docs/PORTFOLIO_ARCHITECTURE.md`, remove `design-system` from the reserved-slug list and remove the sentence that says regeneration skips `work/design-system/`.
8. Delete this file.
9. Run `node scripts/generate-work.mjs` so `work/index.html` and `work/portfolio.css` drop the button.
10. Commit that removal through the normal review process and deploy it. Until that deploy, the previous URL can still be live.

Do not delete `assets/portfolio.css` rules without regenerating `work/portfolio.css`. The generator copies the stylesheet onto the Work page.
