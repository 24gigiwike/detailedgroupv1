import { escapeHtml, renderDocument, renderMedia, renderText } from "./html.mjs";
import { getLegacyRouteMapping } from "../lib/legacy-route-mapping.mjs";

function renderMenu(route) {
  const entries = [
    {
      path: getLegacyRouteMapping(route.record.slug)?.overview || `/case-studies/${route.record.slug}/`,
      label: "Overview & Story"
    },
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

function getEditorialContent(route) {
  return route.type === "overview" ? route.record.overview : route.chapter.content;
}

function renderEditorialHeading(value) {
  const [firstLine, ...remainingLines] = String(value || "").split("\n");
  if (!remainingLines.length) return escapeHtml(value || "");
  return `${escapeHtml(firstLine)}<br class="mobile-editorial-break"> ${escapeHtml(remainingLines.join(" "))}`;
}

function renderHero(route) {
  const isOverview = route.type === "overview";
  const content = getEditorialContent(route);
  const label = isOverview ? "Overview & Story" : route.chapter.label;
  const media = renderMedia({
    type: content.heroMediaType,
    url: isOverview ? content.heroMediaUrl : content.desktopHeroMediaUrl,
    mobileUrl: content.mobileHeroMediaUrl,
    poster: content.heroPosterImage || "",
    alt: isOverview ? route.record.title : ""
  });
  const heroHeading = isOverview
    ? (content.heroHeading || route.record.title)
    : (content.heroHeading || content.heading);
  const heroIntro = content.heroIntro ?? content.intro;
  const note = isOverview ? (content.heroNote || route.record.shortDescription) : content.heroNote;
  const chapterNumber = isOverview
    ? "01"
    : String(route.chapters.indexOf(route.chapter) + 2).padStart(2, "0");

  const mediaSlot = route.record.slug === "ouro" && !isOverview &&
    route.chapter.field === "investorCommunications" ? ' data-media-slot="investorHero"' : "";
  const heroAttributes = `${!isOverview && route.chapter.field === "launch" ? " data-launch-audio" : ""}${mediaSlot}`;
  const shade = route.record.slug === "ouro" && !isOverview &&
    route.chapter.field === "eventBrandIdentity"
    ? '<div class="land-shade" style="background: rgba(0, 0, 0, 0.45);" aria-hidden="true"></div>'
    : '<div class="land-shade" aria-hidden="true"></div>';
  const heading = isOverview && content.heroLogoImage
    ? `<h1 class="ouro-mark"><img src="${escapeHtml(content.heroLogoImage)}" alt="${escapeHtml(route.record.title)}" width="328" height="98"></h1>`
    : `<h1 class="hero-title">${escapeHtml(heroHeading)}</h1>`;

  return `<section class="panel is-video" id="hero"${heroAttributes}>
    ${media}
    ${shade}
    ${!isOverview && route.chapter.field === "launch" && content.heroMediaType === "video"
      ? '<button class="hero-sound-toggle" type="button" aria-label="Turn sound on" aria-pressed="false">Sound off</button>'
      : ""}
    <div class="hero-copy">
      <p class="kicker">${chapterNumber} — ${escapeHtml(label)}</p>
      ${heading}
      ${heroIntro ? `<p class="lead">${escapeHtml(heroIntro)}</p>` : ""}
      ${note ? `<p class="note">${escapeHtml(note)}</p>` : ""}
    </div>
  </section>`;
}

function renderEssay(route) {
  const content = getEditorialContent(route);
  const headlineId = route.type === "overview" ? "overview-headline" : "chapter-headline";
  const editorialHeading = content.editorialHeading || content.heading;
  const editorialIntro = content.editorialIntro || content.intro;
  const body = renderText(content.body);

  return `<section class="essay" aria-labelledby="${headlineId}">
    <div class="essay-col editorial-copy">
      <p class="editorial-intro" id="${headlineId}"><strong>${renderEditorialHeading(editorialHeading)}</strong></p>
      ${editorialIntro ? `<p><span>${escapeHtml(editorialIntro)}</span></p>` : ""}
      ${body.split("\n").filter(Boolean).map((paragraph) => paragraph.replace("<p>", '<p class="editorial-body">')).join("\n")}
    </div>
  </section>`;
}

function renderGallery(chapter) {
  const items = chapter.content.gallery || [];
  if (!items.length) return "";
  const galleryClass = chapter.field === "brandIdentity"
    ? "brand-gallery"
    : chapter.field === "eventBrandIdentity"
      ? "event-gallery"
      : "chapter-gallery";

  return `<section class="vertical-gallery ${galleryClass}" aria-label="${escapeHtml(chapter.label)} gallery">
    <div class="gallery-container">
      ${items.map((item) => {
        const dimensions = Number.isInteger(item.width) && Number.isInteger(item.height)
          ? ` width="${item.width}" height="${item.height}"`
          : "";
        const media = item.mediaType === "video"
          ? `<video class="gallery-media" data-scroll-video autoplay muted loop playsinline preload="metadata"${dimensions} aria-label="${escapeHtml(item.alt || item.caption || chapter.label)}"><source src="${escapeHtml(item.mediaUrl)}" type="${item.mediaUrl.toLowerCase().includes(".webm") ? "video/webm" : "video/mp4"}"></video>`
          : `<img class="gallery-media" src="${escapeHtml(item.mediaUrl)}" alt="${escapeHtml(item.alt || "")}" loading="lazy" decoding="async"${dimensions}>`;
        return `<figure class="gallery-item">
        ${media}
        ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ""}
      </figure>`;
      }).join("\n")}
    </div>
  </section>`;
}

function renderKeynoteSlide(slide, index) {
  const title = escapeHtml(slide.title);
  const speaker = slide.speaker ? escapeHtml(slide.speaker) : "";
  const motion = slide.directionNotes ? escapeHtml(slide.directionNotes) : "";
  const contextLabel = slide.contextLabel ? escapeHtml(slide.contextLabel) : "";
  const script = renderText(slide.script || "");
  const scriptNote = renderText(slide.scriptNote || "");
  const visual = slide.mediaType === "video"
    ? `<video class="slide-media" muted loop playsinline preload="metadata"><source src="${escapeHtml(slide.mediaUrl)}" type="${slide.mediaUrl.toLowerCase().includes(".webm") ? "video/webm" : "video/mp4"}"></video><button class="keynote-sound-toggle" type="button" aria-label="Turn sound on" aria-pressed="false">Sound off</button>`
    : `<img class="slide-media" src="${escapeHtml(slide.mediaUrl)}" alt="${title}" loading="lazy" decoding="async">`;

  return `<article class="keynote-slide${index === 0 ? " is-active" : ""}" id="slide-${String(index + 1).padStart(2, "0")}" data-slide-index="${index}" data-title="${title}">
    <div class="slide-visual">
      <div class="slide-media-wrap">${visual}<div class="slide-shade" aria-hidden="true"></div></div>
      <div class="slide-badge">
        <span class="badge-idx">${String(index + 1).padStart(2, "0")}</span>
        <span class="badge-title">${title}</span>
        ${slide.motionLabel ? `<span class="badge-motion">${escapeHtml(slide.motionLabel)}</span>` : ""}
      </div>
    </div>
    <div class="slide-script-section">
      <div class="slide-script-meta">
        <span class="script-badge-num">Slide ${String(index + 1).padStart(2, "0")}</span>
        <h3 class="slide-script-heading">${title}</h3>
        <div class="script-meta-tags">
          ${contextLabel ? `<span class="script-tag">${contextLabel}</span>` : ""}
          ${speaker ? `<span class="script-tag">Speaker: ${speaker}</span>` : ""}
          ${motion ? `<span class="script-tag">Motion: ${motion}</span>` : ""}
        </div>
      </div>
      <div class="slide-script-body">
        ${script}
        ${scriptNote ? `<div class="script-note-box">${scriptNote}</div>` : ""}
      </div>
    </div>
  </article>`;
}

function renderKeynote(record) {
  const slides = record.keynoteSlides || [];
  if (!slides.length) return "";
  const heading = record.keynoteHeading || "Keynote Presentation";
  const kicker = record.keynoteKicker || "Presentation";
  const intro = record.keynoteIntro || "";

  return `<section class="keynote-section" id="keynote" aria-label="${escapeHtml(heading)}">
    <div class="keynote-header">
      <p class="kicker">${escapeHtml(kicker)}</p>
      <h2 class="keynote-heading">${escapeHtml(heading)}</h2>
      ${intro ? `<p class="keynote-subtitle">${escapeHtml(intro)}</p>` : ""}
    </div>
    <div class="keynote-stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="${escapeHtml(heading)} slides">
      <div class="keynote-deck">
        ${slides.map(renderKeynoteSlide).join("\n")}
      </div>
      <div class="keynote-controls" aria-label="Keynote controls">
        <div class="keynote-counter"><span class="current-slide">01</span> / <span class="total-slides">${String(slides.length).padStart(2, "0")}</span></div>
        <div class="keynote-current-title" aria-live="polite">${escapeHtml(slides[0].title)}</div>
        <div class="keynote-nav-btns">
          <button type="button" class="keynote-nav-btn prev" aria-label="Previous slide" disabled>← Prev</button>
          <button type="button" class="keynote-nav-btn next" aria-label="Next slide"${slides.length === 1 ? " disabled" : ""}>Next →</button>
        </div>
      </div>
    </div>
  </section>`;
}

function renderInvestorDeck(record) {
  const slides = record.investorDeckSlides || [];
  if (!slides.length) return "";
  const heading = record.investorDeckHeading || "Investor Deck";
  const initialSlide = slides[0];

  return `<section class="investor-deck-section" aria-labelledby="investor-deck-heading">
    <div class="investor-deck-intro editorial-copy" data-reveal>
      <h2 id="investor-deck-heading">${escapeHtml(heading)}</h2>
    </div>
    <div class="investor-carousel" aria-label="${escapeHtml(heading)} carousel">
      <div class="investor-carousel-view" role="group" aria-roledescription="carousel" aria-label="${escapeHtml(heading)} slides">
        <button class="investor-image-button" type="button" aria-label="Open slide 1 in image viewer">
          <img class="investor-carousel-image" src="${escapeHtml(initialSlide.imageUrl)}" alt="${escapeHtml(initialSlide.alt || initialSlide.title || "Investor deck slide 1")}" decoding="async">
        </button>
        <div class="investor-carousel-placeholder" hidden>${escapeHtml(heading)} image unavailable</div>
        <div class="investor-slide-data" hidden>${slides.map((slide, index) => `<span data-url="${escapeHtml(slide.imageUrl)}" data-alt="${escapeHtml(slide.alt || slide.title || `Investor deck slide ${index + 1}`)}" data-title="${escapeHtml(slide.title || "")}"></span>`).join("")}</div>
      </div>
      <div class="investor-carousel-controls">
        <button class="investor-carousel-prev" type="button" aria-label="Previous slide">←</button>
        <span class="investor-carousel-counter" aria-live="polite">01 / ${String(slides.length).padStart(2, "0")}</span>
        <button class="investor-carousel-next" type="button" aria-label="Next slide">→</button>
      </div>
    </div>
    <dialog class="investor-viewer" aria-label="${escapeHtml(heading)} image viewer">
      <div class="investor-viewer-content">
        <button class="investor-viewer-close" type="button" aria-label="Close image viewer">×</button>
        <button class="investor-viewer-prev" type="button" aria-label="Previous slide">←</button>
        <img class="investor-viewer-image" src="${escapeHtml(initialSlide.imageUrl)}" alt="${escapeHtml(initialSlide.alt || initialSlide.title || "Investor deck slide 1")}">
        <button class="investor-viewer-next" type="button" aria-label="Next slide">→</button>
        <span class="investor-viewer-counter" aria-live="polite">01 / ${String(slides.length).padStart(2, "0")}</span>
      </div>
    </dialog>
  </section>`;
}

function renderOverviewLinks(route) {
  return route.chapters.map((chapter) => {
    const content = chapter.content;
    const ctaDestination = {
      brandIdentity: "brand",
      launch: "launch",
      eventBrandIdentity: "event",
      investorCommunications: "investor"
    }[chapter.field];
    const media = renderMedia({
      type: content.heroMediaType,
      url: content.desktopHeroMediaUrl,
      mobileUrl: content.mobileHeroMediaUrl,
      poster: content.heroPosterImage || "",
      alt: "",
      className: "",
      preload: "none"
    });
    return `<a class="next-chapter directory-panel" href="${chapter.path}" data-cta-dest="${ctaDestination}" aria-label="Explore ${escapeHtml(chapter.label)}">
    ${media}
    <span class="next-shade" aria-hidden="true"></span>
    <span class="next-label">${escapeHtml(chapter.label)} <span aria-hidden="true">→</span></span>
  </a>`;
  }).join("\n");
}

function renderNextLink(route) {
  if (route.next) {
    const content = route.next.content;
    const ctaDestination = {
      brandIdentity: "brand",
      launch: "launch",
      eventBrandIdentity: "event",
      investorCommunications: "investor"
    }[route.next.field];
    const media = renderMedia({
      type: content.heroMediaType,
      url: content.desktopHeroMediaUrl,
      mobileUrl: content.mobileHeroMediaUrl,
      poster: content.heroPosterImage || "",
      alt: "",
      className: "",
      preload: "none"
    });
    return `<a class="next-chapter" href="${route.next.path}" data-cta-dest="${ctaDestination}" aria-label="Explore ${escapeHtml(route.next.label)}">
      ${media}
      <span class="next-shade" aria-hidden="true"></span>
      <span class="next-label">${escapeHtml(route.next.label)} <span aria-hidden="true">→</span></span>
    </a>`;
  }
  return `<a class="chapter-closeout" href="/"><span>Detailed Group →</span></a>`;
}

export function renderCaseStudyPage(route) {
  const isOverview = route.type === "overview";
  let pageBody = `${renderMenu(route)}
<main id="study">
  ${renderHero(route)}
  ${renderEssay(route)}`;

  if (isOverview) {
    pageBody += `\n  ${renderOverviewLinks(route)}`;
  } else {
    pageBody += `\n  ${renderGallery(route.chapter)}`;
    if (route.chapter.field === "launch") pageBody += `\n  ${renderKeynote(route.record)}`;
    if (route.chapter.field === "investorCommunications") pageBody += `\n  ${renderInvestorDeck(route.record)}`;
    pageBody += `\n  ${renderNextLink(route)}`;
  }
  pageBody += "\n</main>";
  const pageTitle = isOverview ? "Overview & Story" : route.chapter.label;
  const documentTitle = route.record.slug === "ouro"
    ? `${pageTitle} — ${route.record.title}`
    : `${route.record.title} — ${pageTitle}`;
  return renderDocument(documentTitle, pageBody);
}
