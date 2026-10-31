# Case study publishing

## CMS-to-site flow

Pages CMS stores one JSON record per case study in `data/case-studies/` and commits changes to the
configured GitHub repository/branch. A hosting provider must build that branch for approved edits
to reach the public site. The production static build validates every record and generates public
pages only for records with `status: "published"`. Drafts are excluded from both the directory and
public routes. Invalid JSON, required fields, media URLs, or legacy route configuration fail the
build before the existing output is replaced.

The published `ouro` record uses the explicit legacy mapping in `lib/legacy-route-mapping.mjs`:
`/ouro/` and its four existing chapter routes are generated in the build output. It does not create
`/case-studies/ouro/`. New published records use `/case-studies/{slug}/`; enabled chapter routes
follow the fixed Brand Identity, Launch Communications, Event Brand Identity, Investor
Communications order.

## Validate and build

```powershell
npm run build:check
npm test
npm run build
```

The full-site build defaults to `dist/`. It first assembles the site into a sibling staging
directory, then promotes that completed output. It replaces only `dist/` within the repository;
an existing `dist/` is kept if validation, copying, or generation fails. For a disposable preview,
pass a new output directory outside the repository:

```powershell
npm run build -- --out C:\temp\detailedgroup-case-study-preview
```

The external preview directory must not already exist. To preview it locally after building:

```powershell
python -m http.server 8000 --directory C:\temp\detailedgroup-case-study-preview
```

Then open `http://localhost:8000/`. On systems without Python, use an equivalent static file server.

The build copies an explicit public allowlist: existing HTML pages, static media, `assets/`,
`favicon_io/`, `ouro/`, `data/marquee.json` (read by the homepage), and the shared generated-page
interaction script. It does not copy Git metadata, Pages CMS configuration, case-study source JSON,
build scripts, middleware, deployment configuration, or server-side API code.

Generated pages use the existing OURO stylesheet, Lenis smooth scrolling, and shared case-study
interactions at root-absolute URLs. Custom interactions initialize only where their matching
navigation, video, keynote, or investor-deck markup is present.

The templates reproduce the OURO overview and chapter hierarchy, responsive hero media, ordered
chapter navigation and CTAs, Brand/Event vertical galleries, the launch keynote presentation, and
the investor deck carousel/modal. Editorial copy accepts plain text paragraphs separated by blank
lines; `**bold**` and `*italic*` emphasis are rendered safely without permitting raw HTML.

`npm run build` intentionally writes only the assembled `dist/` output; it does not change hosting
settings or deploy. Source OURO pages, CSS, JavaScript, assets, existing redirects, middleware, and
the Header Marquee CMS are not changed. The generated OURO HTML replaces the copied pages only in
the staged build output. If the build is not activated, remove `dist/` and keep serving the current
static source pages. For a release rollback, restore the previous deployed artifact or redeploy the
previous Git revision; do not delete the source OURO files.

`data/case-studies/ouro.json` is the editable content source prepared from the five current OURO
pages and `ouro/assets/ouro.js`. Gallery items may include intrinsic width and height to preserve
the existing media aspect ratios. Newlines in editorial headings render as mobile-only line breaks.

## Hosting configuration (not activated)

The repository includes `netlify.toml` with an edge maintenance function, redirects, and response
headers. Netlify reads that configuration from the repository root, not from the publish folder.
If the live site is on Netlify, set the build command to `npm run build` and the publish directory
to `dist` in the Netlify site settings (or later in the root configuration as a separately approved
deployment change). Keep the repository-root `netlify.toml` and `netlify/edge-functions/` available
to the build/deploy process so the redirects, headers, and maintenance edge function remain active.
Do not upload `dist/` as a standalone folder without those root deployment files.

The repository also contains root `middleware.js` and `api/contact.js`, which follow Vercel
middleware/function conventions. The checked-in files do not establish which provider currently
serves production; confirm the connected hosting project and its settings before activation. A
Vercel project should use the repository as its project root, `npm run build` as its build command,
and `dist` as its output directory, while leaving root middleware and API code available to
Vercel's runtime. Do not configure a second host as a replacement.

`api/contact.js` is server-side code and is deliberately not copied into the static output. Its
runtime must remain connected to the active host; in particular, verify `/api/contact` in a
deployment preview before activation. The repository's Netlify configuration does not define a
Netlify function for that endpoint. The build also does not copy `netlify.toml`, middleware, API
code, or edge-function code into `dist/`; the hosting provider must consume the repository-level
runtime configuration separately.
