# Portfolio architecture

Step 1 defines the portfolio contract for the static Detailed Group site. It does not generate pages, change the homepage, or connect Sanity.

The catalog is [`data/projects.json`](../data/projects.json). When [`content/projects/`](../content/projects/) contains project files, those files are the project records and the catalog `projects` array stays empty. [`scripts/validate-projects.mjs`](../scripts/validate-projects.mjs) checks the combined result with Node.js only. This document is the design and generation plan.

## Repository check

Verified before these files were added:

- Branch `main` matches `origin/main` at `1b3f6d2` (`Add files via upload`).
- The working tree was clean. No uncommitted work was present, and nothing in the site files has changed since the audit.
- The site is still static HTML: [`index.html`](../index.html), [`insights.html`](../insights.html), [`privacy.html`](../privacy.html), [`terms.html`](../terms.html), [`data/marquee.json`](../data/marquee.json), [`.pages.yml`](../.pages.yml), and [`api/contact.js`](../api/contact.js).
- There is still no `package.json`, framework, or host config in the repository.

No approved case-study content exists in the repository. These were reviewed and left in place:

- Homepage “Strategic Challenges” (`#insights` in [`index.html`](../index.html)) describes service situations, not client projects.
- [`insights.html`](../insights.html) contains three placeholder articles. Their links are `href="#"`.

`projects` is therefore an empty array. No client names, metrics, or outcomes were invented.

## Route conventions

| URL | Future file | Role |
| --- | --- | --- |
| `/work/` | `work/index.html` | Portfolio overview |
| `/work/<slug>/` | `work/<slug>/index.html` | One published case study |

Conventions:

- Use trailing-slash directory URLs, not `work.html`.
- `<slug>` is the project `slug`: lowercase kebab-case.
- Drafts never get a directory.
- Canonical host in the current homepage is `https://www.detailedgroup.co`. Generated canonicals should follow that until the apex-versus-www choice is confirmed.
- Homepage section links from a work page must be root paths such as `/#services`. A bare `#services` link only works on the homepage.
- Legal and insight links from nested work pages must be root paths such as `/privacy.html`.

The repository has no rewrite config. Whether the production host already serves `work/index.html` as `/work/` is unverified. Confirm that before treating the routes as live.

Reserved slugs that cannot be project slugs: `index`, `work`, `api`, `data`, `assets`, `images`, `favicon_io`, `privacy`, `terms`, `insights`, `scripts`, `docs`.

## Content data contract

[`data/projects.json`](../data/projects.json) holds `schemaVersion`, `contentRoot`, `taxonomy`, and `projects`. `contentRoot` is `content/projects`. If that folder contains one or more project files, those files replace `projects` and the catalog array must stay empty. Using both is invalid. A repository with no project files still validates the catalog array, which keeps fixture snapshots on `--data` working.

```json
{
  "schemaVersion": 1,
  "taxonomy": {
    "competencies": [
      { "value": "executive-communications", "label": "Executive Communications" }
    ]
  },
  "projects": []
}
```

`schemaVersion` is `1`. Unknown top-level keys are invalid.

Optional project fields may be omitted or set to `null`. They must not be empty strings. Empty arrays are allowed for `services` on drafts and for `gallery`.

### Required on every project

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | Unique, lowercase kebab-case, 80 characters or fewer. Stable identity. Not necessarily the public URL. |
| `slug` | string | Unique, lowercase kebab-case, not reserved. Becomes `/work/<slug>/`. |
| `title` | string | Public title, 140 characters or fewer. |
| `clientVisibility` | `public` or `confidential` | Controls client name and logo. |
| `featured` | boolean | Display flag. Only published featured projects appear in a featured band. |
| `sortOrder` | integer | `0` or greater. Unique across every project, including drafts. Lower numbers come first. |
| `status` | `draft` or `published` | Drafts are excluded from HTML. |

### Required only when `status` is `published`

| Field | Type | Rule |
| --- | --- | --- |
| `summary` | string | Card and meta fallback, 400 characters or fewer. |
| `description` | string | Full overview, 8000 characters or fewer. Required for a published project only when `blocks` is missing or empty. |
| `category` | string | Exactly one competency `value`. |
| `services` | string array | One or more competency values. Must include `category`. No duplicates. |
| `coverImage` | image object | Overview card and default social image. |
| `clientDescriptor` | string | Required only for published confidential projects. Anonymous public description, such as a sector phrase. 200 characters or fewer. |

A published project does not need results, a video, a gallery, a client name, or a completion date.

### Optional

| Field | Type | Rule |
| --- | --- | --- |
| `industry` | string | Free text, 80 characters or fewer. Not a controlled taxonomy yet. |
| `clientName` | string | Public projects only. 120 characters or fewer. |
| `clientDescriptor` | string | Optional on public projects and drafts. |
| `clientLogo` | image object | Public projects only. |
| `challenge` | string | Plain text, 4000 characters or fewer. |
| `approach` | string | Plain text, 4000 characters or fewer. |
| `solution` | string | Plain text, 4000 characters or fewer. |
| `outcomes` | string | Qualitative plain text, 4000 characters or fewer. There is no metrics field. |
| `heroImage` | image object | Detail hero. Generator falls back to `coverImage`. |
| `gallery` | image array | Up to 24 images. |
| `videoUrl` | string | `https` URL only. |
| `completionDate` | string | Real `YYYY-MM-DD` date. |
| `seoTitle` | string | 70 characters or fewer. Falls back to `title`. |
| `seoDescription` | string | 200 characters or fewer. Falls back to `summary`. |
| `ogImage` | image object | Falls back to `coverImage`, then `heroImage`. |
| `blocks` | block array | Up to 40 ordered content blocks. When this array is non-empty, it replaces challenge, approach, solution, outcomes, gallery, and `videoUrl` in the detail page. |

### Content blocks

Each block is an object with a `type`. The array order is the page order.

| `type` | Fields | Rendering |
| --- | --- | --- |
| `narrative` | `text` | Narrow Markdown: paragraphs, `- ` lists, `**bold**`, `*emphasis*`, and links. |
| `heading` | `text` | Escaped section heading. |
| `image` | `src`, `alt`, optional `caption` | Full-width figure. |
| `gallery` | `images` | One to 24 image objects. |
| `image-pair` | `primary`, `secondary` | Two figures. One column on small screens, two from the `md` breakpoint. |
| `video` | `url`, optional `caption` | Same film rules as `videoUrl`. No autoplay. |
| `quote` | `text`, optional `attribution`, optional `role` | Blockquote. Use only an approved quotation. |
| `workstream` | `title`, `summary`, optional `text` | One labeled workstream. `text` uses the same narrow Markdown as narrative. |

Narrative Markdown is escaped before tags are added. Raw HTML and Markdown images are invalid. Links must be site-root paths or `https` URLs. Heading text is not parsed as Markdown.

### Image object

| Field | Required | Rule |
| --- | --- | --- |
| `src` | yes | Site-root path (`/images/...`) or `https` URL. |
| `alt` | yes | Specific description, 300 characters or fewer. Must not be the filename. |
| `caption` | no | 300 characters or fewer. |

Rejected URLs: `http`, `javascript:`, `data:`, protocol-relative `//`, `..`, backslashes, whitespace, angle brackets, and embedded credentials. Bare relative paths such as `exec.jpg` are rejected because pages will live in nested directories.

## Taxonomy

One list, `taxonomy.competencies`, supplies both the primary category and the services. The validator reads this list from JSON. It does not hardcode the labels, so the names cannot drift inside the script.

Initial values match the four homepage competencies:

| `value` | `label` |
| --- | --- |
| `executive-communications` | Executive Communications |
| `internal-communications` | Internal Communications |
| `presentation-systems` | Presentation Systems |
| `organizational-storytelling` | Organizational Storytelling |

Rules:

- A project has one `category` and one or more `services`.
- `services` includes the primary category, then any additional competencies actually delivered.
- Labels are the public words. Values are the stored identifiers.
- Add a future competency by appending `{ "value", "label" }` to `taxonomy.competencies`. Do not rename or reuse a `value`. Existing projects keep validating.
- Removing a `value` that a project still uses fails validation.
- Do not create a second copy of these names in page HTML, the marquee file, or `.pages.yml`.

## Client confidentiality

`clientVisibility` decides what is allowed in the file and, later, in HTML.

Public:

- `clientName` and `clientLogo` may be present.
- Absence of either is valid. Do not invent a name or logo to fill the gap.

Confidential:

- `clientName` and `clientLogo` must be omitted or `null`.
- A published confidential project needs `clientDescriptor`, which is the only client line the page may show.
- `id`, `slug`, title, story, SEO, alt text, captions, and `src` paths must already be anonymous. The validator rejects email addresses in those fields for confidential projects.
- The validator cannot recognize an undisclosed client name hidden in prose. Editors remain responsible for that.
- Validation errors name `projects[<index>]` and the field. They do not print field values.
- Do not store a confidential legal name in this public repository, in image filenames, or in a future public Sanity dataset.

The generator must ignore `clientName` and `clientLogo` whenever visibility is confidential, even if a later edit bypasses validation.

## Validation

Run:

```bash
node scripts/validate-projects.mjs
```

The script uses Node’s built-in `fs`, `path`, and `url` modules. No package is installed. `validatePortfolioData` is exported so the future generator can call the same rules.

It checks JSON shape, required fields, unique ids, unique slugs, slug format, reserved slugs, competency values, status, visibility, image objects, unique `sortOrder`, optional types, URL safety, published requirements, and confidential restrictions. Unknown keys are errors, which keeps metrics, testimonials, and private notes out of the file.

Exit code `0` means the file is valid. Exit code `1` means it is not. A valid file may contain zero projects.

Supported shapes:

- Zero projects.
- One or many published projects.
- Drafts with only the always-required fields.
- Featured and non-featured projects.
- Public clients, anonymous public projects, and confidential projects.
- Published projects with no gallery, video, outcomes, or client name.

## Static generation strategy

Do not build this in Step 1. Proposed next script: `scripts/generate-work.mjs`.

1. Read `data/projects.json`, then replace `projects` with `content/projects/*.json` when those files exist. Step 3A is the current rule. `--data` still reads one snapshot and does not merge the folder.
2. Call `validatePortfolioData`. Stop without writing HTML if it returns errors.
3. Keep projects whose `status` is `published`.
4. For confidential projects, drop `clientName` and `clientLogo` before rendering.
5. Sort by `featured` descending, then `sortOrder` ascending, then `slug` ascending. Unique `sortOrder` makes the slug tie-break defensive only.
6. Write `work/index.html`.
   - Featured published projects can lead the grid.
   - Remaining published projects follow in the same sort.
   - Zero published projects produce an editorial empty state and no sample cards.
7. Write `work/<slug>/index.html` for each published project.
8. Metadata:
   - Title: `seoTitle` or `title`.
   - Description: `seoDescription` or `summary`.
   - Open Graph image: `ogImage` or `coverImage`.
   - Canonical: `https://www.detailedgroup.co/work/` or `https://www.detailedgroup.co/work/<slug>/`.
   - No client name in metadata when visibility is confidential.
9. Related projects: up to three other published projects that share `category`, in the same sort, excluding the current slug. If none match, show the next published projects. If only one project exists, omit the related band.
10. Omit any section whose field is null or missing. Do not render empty headings for challenge, approach, solution, outcomes, gallery, or video.
11. Delete a previously generated `work/<slug>/` directory when that slug is no longer published, so retired drafts do not stay on the site. Do not delete unrelated files.

The overview and detail pages are static HTML. Portfolio content is not fetched in the browser. The existing marquee fetch in [`index.html`](../index.html) stays limited to [`data/marquee.json`](../data/marquee.json).

## Design integration

Portfolio pages must look like [`index.html`](../index.html). They must not use the separate stylesheet in [`insights.html`](../insights.html), [`privacy.html`](../privacy.html), or [`terms.html`](../terms.html). Those pages use a different background, container, and an unloaded “Fustat” font.

### Tokens to carry into generated pages

From the `tailwind-config` block in [`index.html`](../index.html) lines 43–102:

- Background `#000000`, primary text `#ffffff`, silver `#C0C0C0`, muted secondary `#a1a1a1`.
- Surfaces `#0a0a0a` and `#111111`. Borders use `outline` `#333333` and white at about 10% opacity.
- Corner radius `0`, except the existing full pill used only for dots.
- Margins: 24px mobile, 48px tablet, 80px desktop. Gutter 40px. Container max 1440px.
- Section padding: 80px mobile, 160px desktop.
- Font stack: SF Pro Display, SF Pro Text, Helvetica Neue, Arial, sans-serif.
- Type roles already named in Tailwind: `display-xl`, `headline-xl`, `headline-lg`, `headline-md`, `body-lg`, `body-md`, `label-sm`, `label-md`.

Also carry:

- Fixed header at 80px and the white announcement bar. Homepage offset is `mt-[116px]` with `scroll-padding-top: 116px`.
- Eyebrow labels: `font-label-sm`, uppercase, wide tracking, `text-silver/40`.
- Square buttons: white fill on black text, and the ghost border used by “Book A Consultation”.
- `.reveal` scroll fade, disabled when `prefers-reduced-motion: reduce`.
- Breakpoints already used: `sm` 640, `md` 768, `lg` 1024. The mobile menu switches at 768.

### Patterns to reuse

- Header, mobile menu, announcement bar, and footer structure from [`index.html`](../index.html). Work pages need root-absolute links, including a Work item that points to `/work/`.
- Overview cards follow the Strategic Challenges articles around lines 933–960: 16:9 media, `border border-white/10`, grayscale image, slow hover scale, index eyebrow, title, and summary. Card links go to `/work/<slug>/`.
- Detail intro can use the 12-column split from `#approach` (line 687): copy in five columns, media from column 7.
- Story sections use the bordered, numbered treatment from `#values` rather than a new card language.
- The marquee loader can stay, still reading `/data/marquee.json`. Pages CMS remains the marquee editor.

### What is not reusable as a component

There is no shared CSS or JS file. Step 2 has to copy the token block and chrome into the generator templates. Do not edit [`index.html`](../index.html) while doing that.

Do not reuse the splash video, Three.js globe, flip cards, or trust-video markup. The trust video currently uses React `className` and `autoPlay` inside raw HTML, so it is not a pattern to copy.

### Page-specific decisions

- Overview images stay in the homepage grayscale treatment.
- Detail heroes should render in color inside the same square black frame. The case study image is the content; the homepage can remain atmospheric. This does not change the homepage.
- A missing gallery, video, or outcome section is omitted.
- The empty overview is a single editorial block: eyebrow “Work”, a short statement that case studies will be published here, and the existing consultation link. No placeholder projects.
- Homepage “Selected Work” and the header Work link wait until generation exists and the empty state is an intentional public page. They are not part of Step 1.

## Future Sanity mapping

Sanity is not installed. When it is, published documents replace `projects` inside the generator. `taxonomy.competencies` can become Sanity documents or a fixed string list with the same `value` and `label`. The marquee stays on Pages CMS.

| Local field | Sanity field | Notes |
| --- | --- | --- |
| project object | document type `project` | One document per case study. |
| `id` | document `_id` | Keep a stable id. Do not derive it from the client name. |
| `slug` | `slug` | Sanity slug type. Generator uses `slug.current`. |
| `title` | `title` string | |
| `summary` | `summary` text | |
| `description`, `challenge`, `approach`, `solution`, `outcomes` | Portable Text | Step 2 still renders plain text. The generator later renders blocks and ignores empty blocks. |
| `category` | reference to `competency` | One reference. |
| `services` | array of references to `competency` | Must include the category reference. |
| `industry` | string | |
| `clientVisibility` | `public` or `confidential` | |
| `clientName`, `clientLogo` | public fields | Query them only for `public` documents. Do not put a confidential legal name in the public dataset. |
| `clientDescriptor` | string | Safe public line. |
| image fields | Sanity image with `alt` and optional `caption` | `src` becomes the CDN URL at build time. Hotspot and crop can wait. |
| `gallery` | array of images | |
| `videoUrl` | URL | `https` only. |
| `featured` | boolean | |
| `sortOrder` | number | Same unique ordering rule. |
| `status` | Sanity draft/publish | A draft document is not published HTML. Do not keep a second conflicting status unless it mirrors the published id. |
| `completionDate` | date | |
| `seoTitle`, `seoDescription`, `ogImage` | `seo` object | Fallbacks stay in the generator. |

Build behavior later:

- Use a read token that can see published documents only during the static build.
- A webhook from Sanity triggers the existing static host rebuild.
- Preview needs a separate draft-capable path. It is not part of the first generator.
- Image URLs should be requested at a sensible width from Sanity’s image pipeline instead of committing large binaries.
- Transformed local JSON can remain the generator input, so page templates do not learn Sanity’s response shape.

## Known risks and unresolved decisions

- `/work/` depends on directory indexes. The host is still unconfirmed: the readme names Netlify, and the contact handler is shaped like a Vercel function.
- An empty `/work/` page may be too soon to link from the homepage. Confirm before nav changes.
- The validator cannot detect a client identity written into ordinary sentences or filenames unless an email address is present.
- Copying the homepage chrome will duplicate a large token and script block until a shared include exists. There is no build include system today.
- Tailwind is loaded from a CDN at runtime. Generated pages inherit that cost and that network dependency.
- Canonical `www` versus the apex domain is unverified.
- No real project images exist yet. Do not add stock photography as a stand-in.
- Sanity project, dataset, and studio are not created.
- Who may approve a public client name or logo is unresolved.

## Step 2 implementation checklist

1. Confirm the host serves `work/index.html` as `/work/` and `work/<slug>/index.html` as `/work/<slug>/`.
2. Add `scripts/generate-work.mjs` that imports `validatePortfolioData` and writes nothing when validation fails.
3. Generate `work/index.html` from the current empty `projects` array, using the homepage tokens and an empty state.
4. Include detail-page template handling for one project, many projects, drafts, featured order, public clients, confidential clients, and missing gallery, video, and outcomes. Prove those with a temporary fixture that is not committed and contains no real or invented client.
5. Use root-absolute navigation. Leave [`index.html`](../index.html) unchanged unless a later step explicitly adds the Work link.
6. Keep `.pages.yml` and the marquee data untouched.
7. Re-run `node scripts/validate-projects.mjs`.
8. Do not install packages, add fake case studies, or commit large media.

## Step 2 implementation

`scripts/generate-work.mjs` now renders the portfolio. It does not change the Step 1 contract.

```bash
node scripts/validate-projects.mjs
node scripts/generate-work.mjs
```

Fixture previews can use `--data` and `--out`. `--out` must be `work/` or a directory under the system temp path. A validation failure exits before any file is written.

Generated files start with `<!-- detailed-group:generated-work -->`. The script only deletes a `work/<slug>/` directory when that slug is no longer published, the directory contains only `index.html`, that file is not a symlink, and it carries the marker. Any other directory is left in place.

### Empty production output

The public dataset has one unpublished draft and no published projects, so the generator writes only `work/index.html`. That page is an editorial empty state: no cards, no sample clients, and `noindex, follow` so the placeholder is not indexed. Canonical URL: `https://www.detailedgroup.co/work/`. The homepage navigation is unchanged, so the empty page is not linked from `index.html`. The work page’s own header does include Work, because that is the page being viewed. The draft is not named on that page.

### Case-study template

Published projects are sorted by `featured` descending, then `sortOrder` ascending, then `slug`. Drafts are omitted. Detail pages use `seoTitle` or `title`, `seoDescription` or `summary`, and `ogImage` or `coverImage` or `heroImage`. Overview cards use grayscale cover images. Detail heroes and galleries stay in color. Challenge, approach, solution, outcomes, gallery, film, and related work are omitted when empty. One published project has no related band. Related work prefers the same category, then any other published projects, up to three.

Confidential rendering never prints `clientName` or `clientLogo`, even if those fields are present in memory. The public client line is the descriptor only. YouTube and Vimeo films are iframes built from the video id, without the original query string. `mp4`, `webm`, `ogg`, and `ogv` URLs use a `video` element with controls and no autoplay. Any other `https` URL is a text link whose visible label is the hostname.

### Contract notes, unchanged

The validator does not allowlist image extensions. A site-root path or `https` URL is enough, including jpeg, png, webp, gif, avif, and svg. The generator places those URLs in `img` `src` attributes and does not inline file contents. This was left as-is rather than changing the Step 1 contract.

The work header keeps the mobile menu through the `lg` breakpoint (1024px). Six links plus the consultation button do not fit the homepage’s 768px desktop row. `index.html` still switches at 768px.

### Still unresolved

- Whether production already serves `work/index.html` as `/work/`.
- `www` versus the apex domain.
- When the empty page should be added to the homepage navigation.
- Sanity project, dataset, studio, and the build webhook.
- Who approves a public client name or logo.

## Step 3A — Pages CMS projects

Checked against the Pages CMS documentation at pagescms.org in October 2026:

- Content entries can be `collection`, `file`, or `group`.
- A collection can use `format: json`, one file per record, `filename: "{fields.slug}.json"`, `subfolders: false`, and `exclude`.
- Field types used here are documented: `string`, `text`, `select`, `boolean`, `number`, `date`, `image`, `object`, `rich-text`, and `block`.
- `type: block` with `blockKey: type` stores an ordered array of objects. `list.collapsible` is documented for block lists.
- Reusable `components` can replace a field. An image component stores `src` as the image path string, with `alt` and `caption` beside it.
- Media uploads can use a named source. Project images use `media/projects` and are written back as `/media/projects/...` with safe renamed filenames.
- Select options may use `{ name, label }`. This pipeline expects the stored value to be `name`. The loader also accepts the visible labels defined in `.pages.yml` for category, services, visibility, and status.
- Rich text can be Markdown with `media: false`, which keeps images in image blocks.
- Date fields accept a `yyyy-MM-dd` format. The loader also accepts a leading date on an ISO datetime and drops an empty date.

These are not available, so the config does not pretend they are:

- Conditional fields. Client name and client descriptor both stay visible, with helper text. The validator still rejects a client name or logo on a confidential project.
- A native draft or publish workflow. `status` is an ordinary select. Draft files remain in the public repository, so they must not contain secrets.
- A documented drag handle. Editors reorder the block list; the saved array order is what the generator renders.
- Version history beyond Git.

The marquee stays a `type: file` entry at `data/marquee.json`.

### Source of truth

`node scripts/validate-projects.mjs` and `node scripts/generate-work.mjs` load `data/projects.json`, then read every non-hidden `kebab-case.json` file in `contentRoot`. The filename must match `slug`. A missing `id` becomes the slug. `.gitkeep` is ignored. Any other filename is an error. Symlinked content directories and files are rejected.

`node scripts/generate-work.mjs --data snapshot.json` validates that file alone. It does not merge `content/projects`, so fixture runs cannot leak the real draft into a preview.

### Unpublished ORIVS / OURO draft

`content/projects/orivs-ouro-integrated-communications-ecosystem.json` is `status: draft`. It is not written to `work/`. The file contains only the approved working title, the three named workstreams, and explicit pending copy. It has no client legal name, results, testimonial, approval, or image. `clientVisibility` is `public` with `clientName: null` because no public client name has been approved. The category `organizational-storytelling` is a working classification for the draft, not a published claim. Because the file is in a public repository, it is treated as non-secret.
