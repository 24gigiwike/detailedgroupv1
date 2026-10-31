import { escapeHtml, renderDocument, renderMedia, renderText } from "./html.mjs";

function renderMenu(route) {
  const overviewPath = `/case-studies/${route.record.slug}/`;
  const entries = [
    { path: overviewPath, label: "Overview & Story" },
    ...route.chapters.map((chapter) => ({ path: chapter.path, label: chapter.label }))
  ];
  return `<a class="skip" href="#hero">Skip to chapter</a>
<a class="group-link" href="/">Detailed Group</a>
<div class="chapter-nav">
  <button type="button" class="chapter-toggle" aria-expanded="false" aria-controls="chapter-menu" aria-label="Open chapters"><span></span></button>
  <nav id="chapter-menu" class="chapter-menu" aria-label="Chapters" hidden>
    <button type="button" class="chapter-close" aria-label="Close chapters">×</button>
    <ol>${entries.map((entry, index) => `<li><a href="${entry.path}"${route.path === entry.path ? ' aria-current="page"' : ""}><span>${String(index + 1).padStart(2, "0")}</span> ${escapeHtml(entry.label)}</a></li>`).join("\n")}
    </ol>
  </nav>
</div>`;
}

function renderHero(route) {
  const isOverview = route.type === "overview";
  const content = isOverview ? route.record.overview : route.chapter.content;
  const label = isOverview ? "Overview & Story" : route.chapter.label;
  const media = renderMedia({
    type: content.heroMediaType,
    url: isOverview ? content.heroMediaUrl : content.desktopHeroMediaUrl,
    mobileUrl: content.mobileHeroMediaUrl,
    poster: content.heroPosterImage || "",
    alt: route.record.title
  });
  return `<section class="panel is-video" id="hero">
    ${media}
    <div class="land-shade" aria-hidden="true"></div>
    <div class="hero-copy">
      <p class="kicker">${isOverview ? "01" : String(route.chapters.indexOf(route.chapter) + 2).padStart(2, "0")} — ${escapeHtml(label)}</p>
      <h1 class="hero-title">${escapeHtml(content.heading || route.record.title)}</h1>
      ${content.intro ? `<p class="lead">${escapeHtml(content.intro)}</p>` : ""}
    </div>
  </section>`;
}

function renderEssay(content, id) {
  return `<section class="essay" aria-labelledby="${id}">
    <div class="essay-col editorial-copy">
      <p class="editorial-intro" id="${id}"><strong>${escapeHtml(content.heading || "")}</strong></p>
      ${content.intro ? `<p><span>${escapeHtml(content.intro)}</span></p>` : ""}
      <div class="editorial-body">${renderText(content.body)}</div>
    </div>
  </section>`;
}

function renderGallery(chapter) {
  const items = chapter.content.gallery || [];
  if (!items.length) return "";
  return `<section class="vertical-gallery" aria-label="${escapeHtml(chapter.label)} gallery">
    <div class="gallery-container">
      ${items.map((item) => `<figure class="gallery-item">${item.mediaType === "video"
        ? `<video class="gallery-media" controls playsinline preload="metadata" aria-label="${escapeHtml(item.alt || item.caption || chapter.label)}"><source src="${escapeHtml(item.mediaUrl)}"></video>`
        : `<img class="gallery-media" src="${escapeHtml(item.mediaUrl)}" alt="${escapeHtml(item.alt || "")}" loading="lazy" decoding="async">`}${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ""}</figure>`).join("\n")}
    </div>
  </section>`;
}

function renderKeynoteSlides(record) {
  const slides = record.keynoteSlides || [];
  if (!slides.length) return "";
  return `<section class="vertical-gallery" aria-label="Keynote presentation slides">
    <div class="gallery-container">
      ${slides.map((slide, index) => `<figure class="gallery-item">
        ${slide.mediaType === "video"
          ? `<video class="gallery-media" controls playsinline preload="metadata"><source src="${escapeHtml(slide.mediaUrl)}"></video>`
          : `<img class="gallery-media" src="${escapeHtml(slide.mediaUrl)}" alt="${escapeHtml(slide.title)}" loading="lazy" decoding="async">`}
        <figcaption><strong>${String(index + 1).padStart(2, "0")} — ${escapeHtml(slide.title)}</strong>${slide.speaker ? `<p>Speaker: ${escapeHtml(slide.speaker)}</p>` : ""}${slide.directionNotes ? `<p>${escapeHtml(slide.directionNotes)}</p>` : ""}${slide.script ? `<div class="editorial-body">${renderText(slide.script)}</div>` : ""}</figcaption>
      </figure>`).join("\n")}
    </div>
  </section>`;
}

function renderInvestorSlides(record) {
  const slides = record.investorDeckSlides || [];
  if (!slides.length) return "";
  return `<section class="vertical-gallery" aria-label="Investor deck slides">
    <div class="gallery-container">
      ${slides.map((slide, index) => `<figure class="gallery-item">
        <img class="gallery-media" src="${escapeHtml(slide.imageUrl)}" alt="${escapeHtml(slide.alt || slide.title || `Investor deck slide ${index + 1}`)}" loading="lazy" decoding="async">
        ${slide.title ? `<figcaption>${escapeHtml(slide.title)}</figcaption>` : ""}
      </figure>`).join("\n")}
    </div>
  </section>`;
}

function renderOverviewLinks(route) {
  return route.chapters.map((chapter) => {
    const content = chapter.content;
    const media = renderMedia({
      type: content.heroMediaType,
      url: content.desktopHeroMediaUrl,
      mobileUrl: content.mobileHeroMediaUrl,
      poster: content.heroPosterImage || "",
      alt: ""
    });
    return `<a class="next-chapter directory-panel" href="${chapter.path}" aria-label="Explore ${escapeHtml(chapter.label)}">
    ${media}
    <span class="next-shade" aria-hidden="true"></span>
    <span class="next-label">${escapeHtml(chapter.label)} <span aria-hidden="true">→</span></span>
  </a>`;
  }).join("\n");
}

function renderNextLink(route) {
  if (route.next) {
    return `<a class="next-chapter" href="${route.next.path}" aria-label="Explore ${escapeHtml(route.next.label)}">
      <span class="next-shade" aria-hidden="true"></span>
      <span class="next-label">${escapeHtml(route.next.label)} <span aria-hidden="true">→</span></span>
    </a>`;
  }
  return `<a class="chapter-closeout" href="/case-studies/${route.record.slug}/"><span>Back to ${escapeHtml(route.record.title)} →</span></a>`;
}

export function renderCaseStudyPage(route) {
  const isOverview = route.type === "overview";
  const content = isOverview ? route.record.overview : route.chapter.content;
  let pageBody = `${renderMenu(route)}
<main id="study">
  ${renderHero(route)}
  ${renderEssay(content, isOverview ? "overview-headline" : "chapter-headline")}`;

  if (isOverview) {
    pageBody += `\n  ${renderOverviewLinks(route)}`;
  } else {
    pageBody += `\n  ${renderGallery(route.chapter)}`;
    if (route.chapter.field === "launch") pageBody += `\n  ${renderKeynoteSlides(route.record)}`;
    if (route.chapter.field === "investorCommunications") pageBody += `\n  ${renderInvestorSlides(route.record)}`;
    pageBody += `\n  ${renderNextLink(route)}`;
  }
  pageBody += "\n</main>";
  return renderDocument(`${route.record.title} — ${isOverview ? "Overview & Story" : route.chapter.label}`, pageBody);
}
