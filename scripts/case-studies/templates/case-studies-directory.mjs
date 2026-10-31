import { escapeHtml, renderDocument } from "./html.mjs";

export function renderCaseStudiesDirectory(records) {
  const cards = records
    .filter((record) => record.status === "published")
    .sort((left, right) => left.displayOrder - right.displayOrder || left.title.localeCompare(right.title))
    .map((record) => `<a class="next-chapter directory-panel" href="/case-studies/${escapeHtml(record.slug)}/">
      <img src="${escapeHtml(record.coverImage)}" alt="" aria-hidden="true" loading="lazy" decoding="async">
      <span class="next-shade" aria-hidden="true"></span>
      <span class="next-label">${escapeHtml(record.title)} <span aria-hidden="true">→</span></span>
    </a>
    <p>${escapeHtml(record.category)} — ${escapeHtml(record.shortDescription)}</p>`)
    .join("\n");
  return renderDocument("Case Studies", `<a class="skip" href="#case-studies">Skip to case studies</a>
<a class="group-link" href="/">Detailed Group</a>
<main id="case-studies">
  <section class="panel" id="hero">
    <div class="hero-copy"><h1 class="hero-title">Case Studies</h1></div>
  </section>
  <section class="vertical-gallery" aria-label="Published case studies">
    <div class="gallery-container">${cards || "<p>No published case studies yet.</p>"}</div>
  </section>
</main>`);
}
