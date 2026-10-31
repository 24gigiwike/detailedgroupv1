# Case study generation

The Pages CMS collection stores one JSON record per case study in `data/case-studies/`.
The generator validates those records and plans pages only for records with `status: "published"`.
Chapter routes are emitted in the fixed Brand Identity, Launch Communications, Event Brand Identity,
Investor Communications order, and only when their `enabled` field is `true`.

Run a validation and route-plan check without writing files:

```powershell
node scripts/case-studies/build.mjs --check
```

To render a separate static output tree, pass a new directory outside the repository:

```powershell
node scripts/case-studies/build.mjs --build --out C:\temp\detailedgroup-case-study-preview
```

The output directory must not already exist. Generation never writes into the repository or over
the existing OURO routes. Generated pages use the existing OURO stylesheet, Lenis smooth scrolling,
and shared case-study interactions at their root-absolute URLs. The custom interactions initialize
only when their corresponding navigation, video, keynote, or investor-deck markup is present.

The templates reproduce the OURO overview and chapter hierarchy, responsive hero media, ordered
chapter navigation and CTAs, Brand/Event vertical galleries, the launch keynote presentation, and
the investor deck carousel/modal. Editorial copy accepts plain text paragraphs separated by blank
lines; `**bold**` and `*italic*` emphasis are rendered safely without permitting raw HTML.

The generator is a preview/output foundation, not yet wired to the hosting build. Existing OURO
HTML, assets, routes, CSS, JavaScript, and deployment settings remain unchanged.
