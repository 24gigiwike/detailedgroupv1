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

## Vercel publishing and activation

The publishing flow is Pages CMS commit → configured GitHub branch → Vercel Git deployment.
Confirm the branch Pages CMS writes to is the Vercel Production Branch; Vercel creates Preview
deployments for other connected branches and Production deployments for the configured production
branch. The repository itself does not declare the Pages CMS repository/branch connection.

Configure the existing Vercel project (do not create a second host):

- Framework Preset: **Other**
- Root Directory: repository root
- Build Command and Output Directory are fixed by `vercel.json`: `npm run build` and `dist`.
- Node.js runtime: 22.x (the project and `@vercel/functions` require Node.js 20 or newer).

`vercel.json` explicitly registers the existing root `middleware.js` as Vercel Routing Middleware
through its `proxy.entrypoint` setting. The middleware uses Vercel's `next()` helper to continue
normal requests; it runs on all paths. The existing maintenance gate is currently disabled in its
shared implementation. When enabled, it gates static pages and API requests, except for its
developer-preview-cookie flow. It is a maintenance screen, not authentication.

The build output contains only public static files and generated HTML. Keep deploying from the
repository root so Vercel can separately discover `api/contact.js` as a Node.js Function and
`middleware.js` as Routing Middleware; do not deploy `dist/` as a standalone project. The API
remains CommonJS. `trailingSlash: true` preserves directory-style URLs. `vercel.json` carries over
only the eight explicit historical OURO alias redirects from `netlify.toml`; no catch-all or CMS
rewrites are added. The Netlify edge gate and headers are not used by Vercel. Generated
directory-style `index.html` routes serve the existing OURO URLs and new
`/case-studies/{slug}/` paths without rewrites.

Set these Vercel environment variables for Preview and Production without adding their values to
Git. `@vercel/functions` is an explicit runtime dependency for Vercel's middleware `next()` helper;
the existing API remains CommonJS.

- `EMAIL_SERVICE_API_KEY` — required Resend API key.
- `TO_EMAIL` — optional recipient; defaults to `hello@detailedgroup.co`.

The sender is currently fixed in `api/contact.js`. The contact API is tested locally with a mocked
provider; this does not prove that the Vercel function is deployed or that environment variables
are configured. In a Preview, first test `GET /api/contact` (expected 405) and invalid `POST`
requests (expected 400); neither sends email. Only test a valid submission with an approved test
recipient and the project owner's consent.

Before production activation:

1. Push the reviewed branch through the approved Git workflow and wait for its Vercel Preview.
2. Verify the Preview URL, generated routes, assets, marquee, contact API routing, and middleware.
   Confirm Pages CMS targets the intended repository and that its publishing branch triggers the
   expected Vercel deployment.
3. Obtain explicit production approval. Do not promote Preview automatically.
4. After the approved production deployment, smoke-test the homepage, all five OURO routes,
   `/case-studies/`, one published project, `/api/contact` with a safe invalid request, and the
   maintenance gate state.
5. To roll back, use Vercel Deployments to promote the last known-good deployment. If a CMS commit
   fails validation, the failed build should not replace the active deployment; correct or revert
   the record in Pages CMS/GitHub, then rebuild.

For local checks, run `npm run build:check`, `npm test`, and `npm run build`. The generated `dist/`
is ignored by Git and is not deployed from a local machine by these commands.
