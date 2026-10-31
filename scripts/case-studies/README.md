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
the existing OURO routes. The generated templates reuse OURO's stylesheet classes; the current
OURO HTML and assets remain the visual reference and are not migrated by this phase.
