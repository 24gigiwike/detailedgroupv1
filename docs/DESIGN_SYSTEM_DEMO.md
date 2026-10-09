# Illustrative communications portfolio

Temporary client-meeting page at `/work/design-system/`. The Work-page button is labeled Design System. The page itself is a finished fictional portfolio, not a design system, style guide, or case study.

`noindex, nofollow` asks crawlers not to index the page. It does not make the page private. Anyone with the URL can open it.

SIGNAL Audio, Common Ground, and Northstar are fictional. The photography was generated for this prototype. It is not client work, not Ramp artwork, and not a real campaign.

## What was added

- `work/design-system/index.html`
- `work/design-system/design-system.css`
- `work/design-system/design-system.js`
- `work/design-system/media/*.jpg` — original generated photographs for the three fictional projects
- A “Design System” link in the generated Work overview
- Generator protection so `work/design-system/` is never deleted as a stale project
- Reserved slug `design-system`
- Checks in `scripts/check-published-output.mjs` and `scripts/check-homepage-fixtures.mjs`

## Remove the prototype

1. Delete `work/design-system/`.
2. In `scripts/generate-work.mjs`, remove `PROTECTED_WORK_DIRS`, the skip inside `removeStaleProjects`, the overwrite guard, and the Design System link. Restore the Work introduction without the `.cs-hero-actions` wrapper.
3. In `assets/portfolio.css`, remove `.cs-hero-actions` and `.ds-launch`.
4. In `scripts/validate-projects.mjs`, remove `design-system` from `RESERVED_SLUGS`.
5. In `scripts/check-published-output.mjs`, remove the protected-directory skip and the design-exploration assertions.
6. In `scripts/check-homepage-fixtures.mjs`, remove the design-system survival fixture, the overview-link assertion, and the reserved-slug assertion.
7. In `docs/PORTFOLIO_ARCHITECTURE.md`, remove `design-system` from the reserved-slug list and the sentence that says regeneration skips `work/design-system/`.
8. Delete this file.
9. Run `node scripts/generate-work.mjs` so `work/index.html` and `work/portfolio.css` drop the button.
10. Commit that removal and deploy it. Until that deploy, the URL can still be live.
