#!/usr/bin/env node
/**
 * Generate static /work/ pages from the portfolio catalog.
 * The default read loads content/projects when those files exist.
 * --data reads one isolated JSON snapshot and does not merge content/projects.
 * Uses the portfolio validator. No dependencies.
 *
 *   node scripts/generate-work.mjs
 *   node scripts/generate-work.mjs --data path.json --out /tmp/work-preview
 *
 * The repository command also refreshes homepage Work markers from data/homepage.json.
 * showWork must be true before those markers contain a link or a Selected Work section.
 * --data does not read or write the homepage.
 *
 * Output must be the repository work directory or a directory under the OS temp path.
 * Validation failure writes nothing.
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPortfolio } from './load-projects.mjs';
import { validatePortfolioData } from './validate-projects.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = join(ROOT, 'work');
const PORTFOLIO_CSS = join(ROOT, 'assets', 'portfolio.css');
const SITE = 'https://www.detailedgroup.co';
const MARKER = 'detailed-group:generated-work';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROTECTED_WORK_DIRS = new Set(['design-system']);
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const NAV = [
  { href: '/#services', label: 'Services' },
  { href: '/work/', label: 'Work', key: 'work' },
  { href: '/#approach', label: 'Approach' },
  { href: '/#values', label: 'Values' },
  { href: '/#insights', label: 'Insights' },
  { href: '/#contact', label: 'Contact' },
];

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

function present(value) {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function urlProblem(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) return 'is not a usable URL';
  if (value.startsWith('//') || value.includes('\\') || value.includes('..') || /\s/.test(value) || /[<>]/.test(value)) {
    return 'is not a safe URL';
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return 'is not a valid URL';
    }
    if (url.username || url.password || url.protocol !== 'https:') return 'is not a safe URL';
    return null;
  }
  if (!value.startsWith('/')) return 'is not a site-root path or https URL';
  return null;
}

function assertSafeUrl(value, label) {
  const problem = urlProblem(value);
  if (problem) throw new Error(`${label} ${problem}`);
}

function absoluteUrl(src) {
  assertSafeUrl(src, 'image');
  if (src.startsWith('https://')) return src;
  return `${SITE}${src}`;
}

function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function paragraphs(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function renderInline(source) {
  let out = '';
  let index = 0;
  while (index < source.length) {
    if (source.startsWith('**', index)) {
      const end = source.indexOf('**', index + 2);
      if (end > index + 2) {
        out += `<strong>${renderInline(source.slice(index + 2, end))}</strong>`;
        index = end + 2;
        continue;
      }
    }
    if (source[index] === '*' && source[index + 1] !== '*') {
      const end = source.indexOf('*', index + 1);
      if (end > index + 1 && !source.slice(index + 1, end).includes('\n')) {
        out += `<em>${renderInline(source.slice(index + 1, end))}</em>`;
        index = end + 1;
        continue;
      }
    }
    if (source[index] === '[') {
      const labelEnd = source.indexOf(']', index + 1);
      if (labelEnd > index && source[labelEnd + 1] === '(') {
        const hrefEnd = source.indexOf(')', labelEnd + 2);
        if (hrefEnd !== -1) {
          const label = source.slice(index + 1, labelEnd);
          const href = source.slice(labelEnd + 2, hrefEnd);
          if (label && !label.includes('[') && urlProblem(href) === null) {
            const external = href.startsWith('https://');
            const rel = external ? ' rel="noopener noreferrer" target="_blank"' : '';
            out += `<a href="${escapeHtml(href)}"${rel}>${renderInline(label)}</a>`;
            index = hrefEnd + 1;
            continue;
          }
        }
      }
    }
    const next = source.slice(index).search(/[*[]/);
    if (next === -1) {
      out += escapeHtml(source.slice(index));
      break;
    }
    if (next === 0) {
      out += escapeHtml(source[index]);
      index += 1;
      continue;
    }
    out += escapeHtml(source.slice(index, index + next));
    index += next;
  }
  return out;
}

function markdownHtml(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const items = lines.filter((line) => line.startsWith('- '));
      if (items.length > 0 && items.length === lines.filter((line) => line.trim() !== '').length) {
        return `<ul>${items.map((line) => `<li>${renderInline(line.slice(2))}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.map((line) => renderInline(line)).join('<br>')}</p>`;
    })
    .join('\n');
}

function labelFor(labels, value) {
  return labels.get(value) || value;
}

function compareProjects(a, b) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.slug < b.slug) return -1;
  if (a.slug > b.slug) return 1;
  return 0;
}

export function publishedProjects(data) {
  const labels = new Map(data.taxonomy.competencies.map((entry) => [entry.value, entry.label]));
  const published = data.projects
    .filter((project) => project && project.status === 'published')
    .map((project) => {
      const next = { ...project, gallery: Array.isArray(project.gallery) ? project.gallery : [] };
      if (next.clientVisibility === 'confidential') {
        next.clientName = null;
        next.clientLogo = null;
      }
      return next;
    })
    .sort(compareProjects);
  for (const project of published) {
    if (!SLUG_RE.test(project.slug)) throw new Error('refusing to use an unsafe project slug');
  }
  return { labels, published };
}

function clientLine(project) {
  if (project.clientVisibility === 'confidential') {
    return present(project.clientDescriptor) ? project.clientDescriptor : null;
  }
  if (present(project.clientName)) return project.clientName;
  if (present(project.clientDescriptor)) return project.clientDescriptor;
  return null;
}

function videoPresentation(url) {
  assertSafeUrl(url, 'video');
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    if (YT_ID.test(id || '')) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const fromQuery = parsed.searchParams.get('v');
    const parts = parsed.pathname.split('/').filter(Boolean);
    const id = YT_ID.test(fromQuery || '') ? fromQuery : ((parts[0] === 'embed' || parts[0] === 'shorts') ? parts[1] : '');
    if (YT_ID.test(id || '')) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean).reverse().find((part) => /^\d+$/.test(part));
    if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
  }
  if (/\.(mp4|webm|ogv|ogg)$/i.test(parsed.pathname)) return { kind: 'file', src: url };
  return { kind: 'link', href: url, host: parsed.hostname };
}

function imageTag(image, { eager = false, frame = 'content' } = {}) {
  assertSafeUrl(image.src, 'image');
  const tone = frame === 'card' ? 'cs-card-img' : 'cs-media-img';
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  return `<img class="${tone}" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="${loading}" decoding="async"${priority}>`;
}

function cardHtml(project, index, labels, { lead = false } = {}) {
  const number = String(index + 1).padStart(2, '0');
  const category = labelFor(labels, project.category);
  const line = clientLine(project);
  const client = line ? `<p class="cs-card-client">${escapeHtml(line)}</p>` : '';
  const leadClass = lead ? ' cs-card-lead' : '';
  return `<article class="cs-card reveal${leadClass}">
<a href="/work/${escapeHtml(project.slug)}/">
<div class="cs-card-media">
${imageTag(project.coverImage, { frame: 'card' })}
</div>
<div class="cs-card-body">
<p class="cs-kicker"><span>${number}</span><span class="cs-kicker-rule" aria-hidden="true"></span><span>${escapeHtml(category)}</span></p>
<h3>${escapeHtml(project.title)}</h3>
<p class="cs-card-summary">${escapeHtml(project.summary)}</p>
${client}
</div>
</a>
</article>`;
}

function cardGrid(projects, labels, indexBySlug) {
  return `<div class="cs-grid">
${projects.map((project, index) => cardHtml(project, indexBySlug.get(project.slug), labels, { lead: index === 0 })).join('\n')}
</div>`;
}

function listingSections(published, labels) {
  if (published.length === 0) return '';
  const indexBySlug = new Map(published.map((project, index) => [project.slug, index]));
  const featured = published.filter((project) => project.featured);
  const rest = published.filter((project) => !project.featured);
  const sections = [];
  if (featured.length > 0 && rest.length > 0) {
    sections.push(`<section class="cs-section" aria-labelledby="featured-heading">
<h2 id="featured-heading" class="cs-section-title">Selected</h2>
${cardGrid(featured, labels, indexBySlug)}
</section>`);
    sections.push(`<section class="cs-section" aria-labelledby="listing-heading">
<h2 id="listing-heading" class="cs-section-title">Further work</h2>
${cardGrid(rest, labels, indexBySlug)}
</section>`);
  } else if (featured.length > 0) {
    sections.push(`<section class="cs-section" aria-labelledby="featured-heading">
<h2 id="featured-heading" class="cs-section-title">Selected</h2>
${cardGrid(featured, labels, indexBySlug)}
</section>`);
  } else {
    sections.push(`<section class="cs-section" aria-labelledby="listing-heading">
<h2 id="listing-heading" class="cs-section-title">Case studies</h2>
${cardGrid(published, labels, indexBySlug)}
</section>`);
  }
  return sections.join('\n');
}

function relatedProjects(project, published) {
  const others = published.filter((item) => item.slug !== project.slug);
  if (others.length === 0) return [];
  const same = others.filter((item) => item.category === project.category);
  return (same.length > 0 ? same : others).slice(0, 3);
}

function metaRows(project, labels) {
  const rows = [];
  if (project.clientVisibility !== 'confidential' && project.clientLogo) {
    assertSafeUrl(project.clientLogo.src, 'logo');
  }
  const line = clientLine(project);
  if (line || (project.clientVisibility !== 'confidential' && project.clientLogo)) {
    const logo = project.clientVisibility !== 'confidential' && project.clientLogo
      ? `<img src="${escapeHtml(project.clientLogo.src)}" alt="${escapeHtml(project.clientLogo.alt)}" loading="lazy" decoding="async">`
      : '';
    const text = line ? `<span>${escapeHtml(line)}</span>` : '';
    rows.push(['Client', `<span class="cs-client">${logo}${text}</span>`, true]);
  }
  const services = (project.services || []).map((value) => labelFor(labels, value));
  if (services.length > 0) rows.push(['Services', services.join(', ')]);
  if (present(project.industry)) rows.push(['Industry', project.industry]);
  if (present(project.completionDate)) rows.push(['Completed', formatDate(project.completionDate), false, project.completionDate]);
  if (rows.length === 0) return '';
  return `<dl class="cs-meta">
${rows.map((row) => {
    const [term, value, raw, date] = row;
    const body = raw
      ? value
      : (date
        ? `<time datetime="${escapeHtml(date)}">${escapeHtml(value)}</time>`
        : escapeHtml(value));
    return `<div>
<dt>${escapeHtml(term)}</dt>
<dd>${body}</dd>
</div>`;
  }).join('\n')}
</dl>`;
}

function storyHtml(project) {
  const blocks = [
    ['challenge', 'Challenge'],
    ['approach', 'Approach'],
    ['solution', 'Solution'],
    ['outcomes', 'Outcomes'],
  ].filter(([key]) => present(project[key]));
  if (blocks.length === 0) return '';
  const lastRowStart = blocks.length % 2 === 0 ? blocks.length - 2 : blocks.length - 1;
  return `<div class="cs-legacy">
${blocks.map(([key, title], index) => {
    const borderB = index < lastRowStart ? 'border-b' : 'border-b md:border-b-0';
    const borderR = index % 2 === 0 && index + 1 < blocks.length ? 'md:border-r' : '';
    return `<section id="${key}" class="border-white/10 ${borderB} ${borderR}">
<p class="cs-legacy-index">${String(index + 1).padStart(2, '0')}</p>
<h2>${title}</h2>
<div class="cs-prose">${paragraphs(project[key])}</div>
</section>`;
  }).join('\n')}
</div>`;
}

function galleryHtml(project) {
  if (!project.gallery || project.gallery.length === 0) return '';
  return `<section class="cs-block" aria-labelledby="gallery-heading">
<h2 id="gallery-heading" class="cs-heading">Gallery</h2>
<ul class="cs-gallery is-follow">
${project.gallery.map((image) => `<li>${shotHtml(image)}</li>`).join('\n')}
</ul>
</section>`;
}

function videoBody(url, title) {
  const video = videoPresentation(url);
  if (video.kind === 'iframe') {
    return `<div class="cs-video-frame">
<iframe src="${escapeHtml(video.src)}" title="${escapeHtml(title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>`;
  }
  if (video.kind === 'file') {
    return `<video class="cs-file-video" controls playsinline preload="metadata">
<source src="${escapeHtml(video.src)}">
</video>`;
  }
  return `<a class="cs-video-link" href="${escapeHtml(video.href)}">Watch film</a>
<p class="cs-video-host">${escapeHtml(video.host)}</p>`;
}

function videoHtml(project) {
  if (!present(project.videoUrl)) return '';
  return `<section class="cs-block" aria-labelledby="film-heading">
<h2 id="film-heading" class="cs-heading">Film</h2>
<div class="cs-block is-follow">${videoBody(project.videoUrl, `${project.title} film`)}</div>
</section>`;
}

function shotHtml(image, { eager = false } = {}) {
  assertSafeUrl(image.src, 'image');
  const caption = present(image.caption) ? `<figcaption class="cs-caption">${escapeHtml(image.caption)}</figcaption>` : '';
  return `<figure class="cs-shot">
${imageTag(image, { eager })}
${caption}
</figure>`;
}

function blockClass(block, previous) {
  const follow = previous && (previous.type === 'heading' || previous.type === 'workstream') && (block.type === 'narrative' || block.type === 'quote');
  return follow ? 'cs-block is-follow' : 'cs-block';
}

function blocksHtml(project) {
  return `<div class="cs-story">
${project.blocks.map((block, index) => renderBlock(project, block, index, project.blocks[index - 1])).join('\n')}
</div>`;
}

function renderBlock(project, block, index, previous) {
  const id = `block-${index}`;
  const rhythm = blockClass(block, previous);
  if (block.type === 'narrative') {
    return `<div class="${rhythm} cs-prose">${markdownHtml(block.text)}</div>`;
  }
  if (block.type === 'heading') {
    return `<h2 id="${id}" class="${rhythm} cs-heading">${escapeHtml(block.text)}</h2>`;
  }
  if (block.type === 'workstream') {
    const detail = present(block.text) ? `<div class="cs-prose">${markdownHtml(block.text)}</div>` : '';
    return `<section class="${rhythm} cs-workstream" aria-labelledby="${id}">
<p class="cs-kicker">Workstream</p>
<h2 id="${id}">${escapeHtml(block.title)}</h2>
<p class="cs-workstream-summary">${escapeHtml(block.summary)}</p>
${detail}
</section>`;
  }
  if (block.type === 'image') {
    return `<div class="${rhythm}">${shotHtml(block)}</div>`;
  }
  if (block.type === 'image-pair') {
    return `<div class="${rhythm} cs-pair">
${shotHtml(block.primary)}
${shotHtml(block.secondary)}
</div>`;
  }
  if (block.type === 'gallery') {
    return `<ul class="${rhythm} cs-gallery" aria-label="Gallery">
${block.images.map((image) => `<li>${shotHtml(image)}</li>`).join('\n')}
</ul>`;
  }
  if (block.type === 'video') {
    const caption = present(block.caption) ? `<figcaption class="cs-caption">${escapeHtml(block.caption)}</figcaption>` : '';
    const title = present(block.caption) ? block.caption : `${project.title} film`;
    return `<figure class="${rhythm}">
${videoBody(block.url, title)}
${caption}
</figure>`;
  }
  if (block.type === 'quote') {
    const bits = [block.attribution, block.role].filter((value) => present(value));
    const footer = bits.length > 0 ? `<footer>${escapeHtml(bits.join(' / '))}</footer>` : '';
    return `<blockquote class="${rhythm} cs-quote">
${markdownHtml(block.text)}
${footer}
</blockquote>`;
  }
  throw new Error('refusing to render an unsupported content block');
}

function relatedHtml(project, published, labels) {
  const related = relatedProjects(project, published);
  if (related.length === 0) return '';
  const indexBySlug = new Map(published.map((item, index) => [item.slug, index]));
  return `<section class="cs-related" aria-labelledby="related-heading">
<h2 id="related-heading" class="cs-section-title">Related work</h2>
${cardGrid(related, labels, indexBySlug)}
</section>`;
}

function heroHtml(project) {
  if (!project.heroImage) return '';
  return `<div class="cs-hero-media">${shotHtml(project.heroImage, { eager: true })}</div>`;
}

function overviewSection(project) {
  if (!present(project.description)) return '';
  return `<section class="cs-overview" aria-labelledby="overview-heading">
<h2 id="overview-heading" class="cs-heading">Overview</h2>
<div class="cs-prose is-follow">${paragraphs(project.description)}</div>
</section>`;
}

function detailMain(project, published, labels) {
  const hasBlocks = Array.isArray(project.blocks) && project.blocks.length > 0;
  const body = hasBlocks
    ? blocksHtml(project)
    : `${storyHtml(project)}\n${galleryHtml(project)}\n${videoHtml(project)}`;
  return `<article class="cs-study">
<header class="cs-hero">
<p class="cs-back"><a href="/work/"><span aria-hidden="true">← </span>All work</a></p>
<p class="cs-kicker">${escapeHtml(labelFor(labels, project.category))}</p>
<h1 class="cs-title">${escapeHtml(project.title)}</h1>
<p class="cs-lede">${escapeHtml(project.summary)}</p>
${metaRows(project, labels)}
${heroHtml(project)}
</header>
${overviewSection(project)}
${body}
${relatedHtml(project, published, labels)}
</article>`;
}

function overviewMain(published, labels) {
  const hasProjects = published.length > 0;
  const title = hasProjects ? 'Selected case studies.' : 'Case studies will be published here.';
  const body = hasProjects
    ? 'Approved accounts of Detailed Group’s communication work. A project appears here only after it is cleared for publication.'
    : 'Detailed Group will publish approved case studies here. Each study will describe the communication problem, the approach, and the work that was delivered. Nothing is listed until that account is approved.';
  const introLink = hasProjects ? '' : `<a class="cs-empty-cta" href="/#contact">Book a Consultation</a>`;
  return `<header class="cs-hero">
<p class="cs-kicker">Work</p>
<h1 id="work-heading" class="cs-title">${title}</h1>
<p class="cs-lede">${body}</p>
<div class="cs-hero-actions">
${introLink}
<a class="ds-launch" href="/work/design-system/">Design System <span aria-hidden="true">↗</span></a>
</div>
</header>
${listingSections(published, labels)}`;
}

function contactBand() {
  return `<section class="py-section-gap-mobile md:py-section-gap px-margin-mobile md:px-margin-desktop border-t border-white/10" aria-labelledby="contact-cta">
<div class="max-w-container-max mx-auto">
<p class="font-label-sm text-label-sm uppercase tracking-[0.2em] text-silver/40 mb-6">Get in touch</p>
<h2 id="contact-cta" class="font-display-xl text-[40px] md:text-[64px] text-white max-w-4xl">Let's Clarify The Message.</h2>
<p class="font-body-lg text-silver/60 max-w-xl mt-8">Contact Detailed Group about a launch, keynote, strategic announcement, or leadership transition.</p>
<a class="inline-flex border border-white/30 text-white font-label-md text-label-md uppercase tracking-widest px-8 md:px-12 py-4 md:py-5 mt-12 hover:bg-white hover:text-black transition-all duration-500" href="/#contact">Book a Consultation</a>
</div>
</section>`;
}

function navLinks(current) {
  return NAV.map((item) => {
    const currentAttr = item.key === 'work' && current === 'overview' ? ' aria-current="page"' : '';
    const tone = item.key === 'work' && current === 'overview' ? 'text-white' : 'text-silver/60 hover:text-white';
    return `<a class="font-label-md text-label-md uppercase tracking-widest ${tone} transition-colors duration-500"${currentAttr} href="${item.href}">${item.label}</a>`;
  }).join('\n');
}

function mobileLinks(current) {
  return NAV.map((item) => {
    const currentAttr = item.key === 'work' && current === 'overview' ? ' aria-current="page"' : '';
    const tone = item.key === 'work' && current === 'overview' ? 'text-white' : 'text-silver/60 hover:text-white';
    return `<a class="mobile-nav-link font-label-md uppercase tracking-widest ${tone} transition-colors duration-500"${currentAttr} href="${item.href}">${item.label}</a>`;
  }).join('\n');
}

function chrome(current) {
  return `<a class="skip-link" href="#content">Skip to content</a>
<header class="bg-black/80 backdrop-blur-2xl border-b border-white/10 fixed top-0 w-full z-50">
<nav class="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-unit max-w-container-max mx-auto h-[80px]" aria-label="Primary">
<a class="flex items-center gap-3 shrink-0" href="/">
<span class="logo-mark h-3 w-3" aria-hidden="true"></span>
<span class="font-display-xl text-[20px] font-semibold tracking-[-0.05em] text-white">Detailed</span>
</a>
<div class="hidden lg:flex items-center gap-8 xl:gap-10">
${navLinks(current)}
</div>
<div class="flex items-center gap-3">
<button aria-controls="mobile-menu" aria-expanded="false" aria-label="Open navigation menu" class="lg:hidden flex items-center justify-center w-10 h-10 text-white" id="mobile-menu-btn" type="button">
<span class="material-symbols-outlined text-[22px]" id="mobile-menu-icon">menu</span>
</button>
<a href="/#contact" class="hidden lg:inline-flex items-center border border-white/20 text-white font-label-md text-label-md uppercase tracking-widest px-4 py-3 lg:px-8 lg:py-3.5 hover:bg-white hover:text-black transition-all duration-500 whitespace-nowrap">Book Consultation</a>
</div>
</nav>
<div aria-hidden="true" class="lg:hidden fixed inset-0 z-[60]" id="mobile-menu">
<div class="mobile-menu-backdrop" aria-hidden="true"></div>
<div class="mobile-menu-panel">
<div class="mobile-menu-header">
<div class="mobile-menu-brand">
<span class="logo-mark h-3 w-3" aria-hidden="true"></span>
<span class="font-display-xl text-[20px] font-semibold tracking-[-0.05em] text-white">Detailed</span>
</div>
<button aria-label="Close navigation menu" id="mobile-menu-close" type="button">
<span class="material-symbols-outlined text-[22px]">close</span>
</button>
</div>
<div class="mobile-menu-inner">
<nav aria-label="Mobile navigation" class="mobile-menu-nav">
${mobileLinks(current)}
</nav>
<a class="mobile-menu-cta font-label-md uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-500" href="/#contact">Book Consultation</a>
</div>
</div>
</div>
</header>
<div class="bg-white text-black py-2.5 fixed top-[80px] w-full z-40 overflow-hidden" aria-label="Announcements">
<div class="flex animate-announcement-scroll whitespace-nowrap">
<div class="flex items-center gap-8 md:gap-16 px-4 shrink-0" id="marquee-track"></div>
</div>
</div>`;
}

function footerHtml() {
  return `<footer class="bg-black border-t border-white/10 py-16 md:py-32">
<div class="flex flex-col md:flex-row justify-between items-start w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto gap-12 md:gap-24">
<div class="max-w-md">
<div class="flex items-center gap-3 mb-8 md:mb-12">
<span class="logo-mark h-4 w-4" aria-hidden="true"></span>
<span class="font-display-xl text-[28px] font-bold tracking-tighter text-white">Detailed.</span>
</div>
<p class="font-body-md text-silver/40 leading-relaxed max-w-xs">© 2026 Detailed. All rights reserved. Strategic Internal Communications. Precision-engineered narratives for the world's most influential organizations.</p>
</div>
<div class="grid grid-cols-2 sm:grid-cols-3 gap-10 md:gap-24 w-full md:w-auto">
<div class="flex flex-col gap-6">
<span class="font-label-sm text-label-sm uppercase tracking-widest text-white font-bold">Explore</span>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="/#services">Services</a>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="/#approach">Approach</a>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="/#values">Values</a>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="/work/">Work</a>
</div>
<div class="flex flex-col gap-6">
<span class="font-label-sm text-label-sm uppercase tracking-widest text-white font-bold">Legal</span>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="/privacy.html">Privacy</a>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="/terms.html">Terms</a>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="/insights.html">Insights</a>
</div>
<div class="flex flex-col gap-6">
<span class="font-label-sm text-label-sm uppercase tracking-widest text-white font-bold">Connect</span>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="https://www.linkedin.com/company/detailedgroup">LinkedIn</a>
<a class="font-body-md text-silver/40 hover:text-white transition-colors" href="https://www.instagram.com/detailedgroup">Instagram</a>
</div>
</div>
</div>
</footer>`;
}

function pageDocument({ title, description, canonical, image, robots, current, main, cssHref }) {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonical,
  }).replace(/</g, '\\u003c');
  return `<!-- ${MARKER} -->
<!DOCTYPE html>
<html class="scroll-smooth" lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>document.documentElement.classList.add('js');</script>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon_io/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon_io/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon_io/favicon-16x16.png">
<link rel="manifest" href="/favicon_io/site.webmanifest">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
const sfPro = ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Arial", "sans-serif"];
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#ffffff",
        "on-primary": "#000000",
        secondary: "#a1a1a1",
        background: "#000000",
        surface: "#000000",
        "surface-container": "#0a0a0a",
        "surface-container-high": "#111111",
        outline: "#333333",
        "outline-variant": "#222222",
        silver: "#C0C0C0",
        graphite: "#383838",
        titanium: "#8E8E93"
      },
      borderRadius: { DEFAULT: "0px", lg: "0px", xl: "0px", full: "9999px" },
      spacing: {
        "margin-desktop": "80px",
        gutter: "40px",
        "margin-mobile": "24px",
        "margin-tablet": "48px",
        unit: "10px",
        "container-max": "1440px",
        "section-gap": "160px",
        "section-gap-mobile": "80px"
      },
      fontFamily: {
        sans: sfPro, "display-xl": sfPro, "headline-xl": sfPro, "headline-lg": sfPro,
        "headline-md": sfPro, "body-lg": sfPro, "body-md": sfPro, "label-sm": sfPro, "label-md": sfPro
      },
      fontSize: {
        "display-xl": ["96px", { lineHeight: "1.05", letterSpacing: "-0.05em", fontWeight: "600" }],
        "headline-xl": ["48px", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "500" }],
        "headline-lg": ["36px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "500" }],
        "headline-md": ["28px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "500" }],
        "body-lg": ["20px", { lineHeight: "1.6", letterSpacing: "-0.01em", fontWeight: "300" }],
        "body-md": ["17px", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "300" }],
        "label-sm": ["11px", { lineHeight: "1.2", letterSpacing: "0.1em", fontWeight: "500" }],
        "label-md": ["13px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "500" }]
      }
    }
  }
};
</script>
<link rel="stylesheet" href="${escapeHtml(cssHref)}">
<script type="application/ld+json">${jsonLd}</script>
</head>
<body class="bg-background text-primary font-sans overflow-x-hidden selection:bg-silver selection:text-black">
${chrome(current)}
<main id="content" class="mt-[116px]">
<section class="py-section-gap-mobile md:py-section-gap px-margin-mobile md:px-margin-desktop">
<div class="max-w-container-max mx-auto min-w-0">
${main}
</div>
</section>
${contactBand()}
</main>
${footerHtml()}
<script>
(function () {
  var menuBtn = document.getElementById('mobile-menu-btn');
  var mobileMenu = document.getElementById('mobile-menu');
  var menuCloseBtn = document.getElementById('mobile-menu-close');
  if (!menuBtn || !mobileMenu) return;
  function closeMenu() {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open navigation menu');
    document.body.classList.remove('menu-open');
  }
  function openMenu() {
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close navigation menu');
    document.body.classList.add('menu-open');
    if (menuCloseBtn) menuCloseBtn.focus();
  }
  menuBtn.addEventListener('click', openMenu);
  if (menuCloseBtn) menuCloseBtn.addEventListener('click', closeMenu);
  var backdrop = mobileMenu.querySelector('.mobile-menu-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeMenu);
  mobileMenu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeMenu); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1024) closeMenu(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && mobileMenu.classList.contains('open')) {
      closeMenu();
      menuBtn.focus();
    }
  });
})();
(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nodes = document.querySelectorAll('.reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    nodes.forEach(function (node) { node.classList.add('active'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('active');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  nodes.forEach(function (node) { observer.observe(node); });
})();
(function () {
  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function loadCmsMarquee() {
    var track = document.getElementById('marquee-track');
    if (!track) return;
    fetch('/data/marquee.json').then(function (response) { return response.json(); }).then(function (data) {
      if (!data.items || !data.items.length) return;
      var items = data.items.map(function (event) {
        return '<span class="font-label-sm text-label-sm uppercase tracking-widest">' + escapeText(String(event.text || '').trim()) + '</span>';
      }).join('<div class="h-1 w-1 bg-black/20 rounded-full shrink-0"></div>');
      var divider = '<div class="h-1 w-1 bg-black/20 rounded-full shrink-0"></div>';
      track.innerHTML = items + divider + items;
    }).catch(function () {});
  }
  document.addEventListener('DOMContentLoaded', loadCmsMarquee);
})();
</script>
</body>
</html>
`;
}

function overviewMeta(published) {
  if (published.length === 0) {
    return {
      title: 'Work | DetailedGroup',
      description: 'Approved Detailed Group case studies will be published here. No project is listed until it is cleared for publication.',
      robots: 'noindex, follow',
      image: `${SITE}/social-preview.jpg`,
    };
  }
  return {
    title: 'Work | DetailedGroup',
    description: 'Approved case studies from Detailed Group. A project appears only after it is cleared for publication.',
    robots: 'index, follow',
    image: absoluteUrl((published[0].ogImage || published[0].coverImage).src),
  };
}

function detailMeta(project) {
  const title = present(project.seoTitle) ? project.seoTitle : `${project.title} | DetailedGroup`;
  const description = present(project.seoDescription) ? project.seoDescription : project.summary;
  const image = project.ogImage || project.coverImage || project.heroImage;
  return {
    title,
    description,
    robots: 'index, follow',
    image: absoluteUrl(image.src),
    canonical: `${SITE}/work/${project.slug}/`,
  };
}

export function renderWorkSite(data) {
  const { labels, published } = publishedProjects(data);
  for (const project of published) {
    if (PROTECTED_WORK_DIRS.has(project.slug)) throw new Error('refusing to overwrite a protected work directory');
    assertSafeUrl(project.coverImage.src, 'cover image');
    if (project.heroImage) assertSafeUrl(project.heroImage.src, 'hero image');
    if (project.ogImage) assertSafeUrl(project.ogImage.src, 'social image');
    if (project.clientVisibility !== 'confidential' && project.clientLogo) assertSafeUrl(project.clientLogo.src, 'logo');
    for (const image of project.gallery) assertSafeUrl(image.src, 'gallery image');
    if (present(project.videoUrl)) videoPresentation(project.videoUrl);
    assertBlocks(project);
  }
  const overview = overviewMeta(published);
  const files = [{
    relativePath: 'index.html',
    html: pageDocument({
      ...overview,
      canonical: `${SITE}/work/`,
      current: 'overview',
      cssHref: 'portfolio.css',
      main: overviewMain(published, labels),
    }),
  }];
  for (const project of published) {
    const meta = detailMeta(project);
    files.push({
      relativePath: `${project.slug}/index.html`,
      html: pageDocument({
        ...meta,
        current: 'detail',
        cssHref: '../portfolio.css',
        main: detailMain(project, published, labels),
      }),
    });
  }
  return files;
}

function assertSafeOutDir(outDir) {
  const resolved = resolve(outDir);
  const tempRoot = resolve(tmpdir());
  const tempRel = relative(tempRoot, resolved);
  const inTemp = tempRel === '' || (tempRel !== '' && !tempRel.startsWith('..') && !isAbsolute(tempRel));
  if (resolved !== resolve(DEFAULT_OUT) && !inTemp) {
    throw new Error('output must be the repository work directory or a temporary directory');
  }
  if (resolved === resolve(ROOT) || resolved === resolve('/')) {
    throw new Error('refusing to use a protected directory as output');
  }
}

function assertRelativeOutput(root, relativePath) {
  if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\')) {
    throw new Error('refusing an unsafe output path');
  }
  const destination = resolve(root, relativePath);
  const rel = relative(root, destination);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('refusing to write outside the output directory');
  return destination;
}

function removeStaleProjects(root, liveSlugs) {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) continue;
    if (PROTECTED_WORK_DIRS.has(entry.name)) continue;
    if (!SLUG_RE.test(entry.name) || liveSlugs.has(entry.name)) continue;
    const dir = resolve(root, entry.name);
    const rel = relative(root, dir);
    if (rel.startsWith('..') || isAbsolute(rel) || rel.includes(sep)) continue;
    let dirStat;
    try {
      dirStat = lstatSync(dir);
    } catch {
      continue;
    }
    if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) continue;
    const names = readdirSync(dir);
    const indexPath = join(dir, 'index.html');
    if (names.length !== 1 || names[0] !== 'index.html' || !existsSync(indexPath)) {
      console.error(`Leaving ${entry.name}/ in place because it contains files this generator did not create.`);
      continue;
    }
    if (lstatSync(indexPath).isSymbolicLink()) {
      console.error(`Leaving ${entry.name}/ in place because its index is a link.`);
      continue;
    }
    const html = readFileSync(indexPath, 'utf8');
    if (!html.includes(MARKER)) {
      console.error(`Leaving ${entry.name}/ in place because it was not generated by this script.`);
      continue;
    }
    rmSync(dir, { recursive: true, force: false });
  }
}

export function writeWorkSite(outDir, files) {
  assertSafeOutDir(outDir);
  const root = resolve(outDir);
  mkdirSync(root, { recursive: true });
  const css = readFileSync(PORTFOLIO_CSS, 'utf8');
  writeFileSync(join(root, 'portfolio.css'), css.endsWith('\n') ? css : `${css}\n`);
  const liveSlugs = new Set();
  for (const file of files) {
    const destination = assertRelativeOutput(root, file.relativePath);
    const parentRel = relative(root, dirname(destination));
    if (parentRel !== '') {
      if (!SLUG_RE.test(parentRel)) throw new Error('refusing to create an unsafe project directory');
      liveSlugs.add(parentRel);
    }
    mkdirSync(dirname(destination), { recursive: true });
    const html = file.html.endsWith('\n') ? file.html : `${file.html}\n`;
    writeFileSync(destination, html);
  }
  removeStaleProjects(root, liveSlugs);
}

function assertBlocks(project) {
  if (!Array.isArray(project.blocks)) return;
  for (const block of project.blocks) {
    if (!block || typeof block !== 'object') throw new Error('refusing to render an unsupported content block');
    if (block.type === 'image') assertSafeUrl(block.src, 'image');
    if (block.type === 'image-pair') {
      assertSafeUrl(block.primary && block.primary.src, 'image');
      assertSafeUrl(block.secondary && block.secondary.src, 'image');
    }
    if (block.type === 'gallery') {
      if (!Array.isArray(block.images)) throw new Error('gallery image is not a usable URL');
      for (const image of block.images) assertSafeUrl(image && image.src, 'gallery image');
    }
    if (block.type === 'video') videoPresentation(block.url);
  }
}

function parseArgs(argv) {
  const args = { dataPath: null, outDir: DEFAULT_OUT };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--data') {
      args.dataPath = argv[index + 1];
      index += 1;
      if (!args.dataPath) throw new Error('--data requires a path');
    } else if (arg === '--out') {
      args.outDir = argv[index + 1];
      index += 1;
      if (!args.outDir) throw new Error('--out requires a path');
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function readPortfolio(dataPath) {
  let raw;
  try {
    raw = readFileSync(dataPath, 'utf8');
  } catch {
    throw new Error('portfolio data could not be read');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('portfolio data is not valid JSON');
  }
}

function homeMarker(name, closing = false) {
  return closing ? `<!-- /dg:home-work:${name} -->` : `<!-- dg:home-work:${name} -->`;
}

function replaceHomeMarker(html, name, replacement) {
  const start = homeMarker(name);
  const end = homeMarker(name, true);
  const startAt = html.indexOf(start);
  const endAt = html.indexOf(end);
  if (startAt < 0 || endAt < startAt) throw new Error(`homepage is missing the ${name} work marker`);
  if (html.indexOf(start, startAt + start.length) !== -1) throw new Error(`homepage repeats the ${name} work marker`);
  const inner = replacement ? `\n${replacement}\n` : '\n';
  return `${html.slice(0, startAt + start.length)}${inner}${html.slice(endAt)}`;
}

function homepageNavLink(kind) {
  const focus = 'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-white';
  if (kind === 'desktop') {
    return `<a class="font-label-md text-label-md uppercase tracking-widest text-silver/60 hover:text-white transition-colors duration-500 ${focus}" href="/work/">Work</a>`;
  }
  if (kind === 'mobile') {
    return `<a class="mobile-nav-link font-label-md uppercase tracking-widest text-silver/60 hover:text-white transition-colors duration-500 ${focus}" href="/work/">Work</a>`;
  }
  return `<a class="font-body-md text-silver/40 hover:text-white transition-colors ${focus}" href="/work/">Work</a>`;
}

function homepageCard(project, index, labels) {
  const category = labelFor(labels, project.category);
  const number = String(index + 1).padStart(2, '0');
  assertSafeUrl(project.coverImage && project.coverImage.src, 'cover image');
  return `<article class="reveal min-w-0">
<a class="group block focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[6px] focus-visible:outline-white" href="/work/${escapeHtml(project.slug)}/">
<div class="aspect-[16/9] overflow-hidden mb-8 md:mb-10 border border-white/10 bg-surface-container">
<img class="w-full h-full object-cover grayscale opacity-50 transition-all duration-[1.5s] group-hover:scale-105 group-hover:opacity-80 group-focus-visible:scale-105 group-focus-visible:opacity-80" src="${escapeHtml(project.coverImage.src)}" alt="${escapeHtml(project.coverImage.alt)}" loading="lazy" decoding="async">
</div>
<div class="flex items-center gap-4 mb-4">
<span class="font-label-sm text-label-sm uppercase tracking-widest text-silver/30">${number}</span>
<div class="h-[1px] w-8 bg-white/10" aria-hidden="true"></div>
<span class="font-label-sm text-label-sm uppercase tracking-widest text-silver/30">${escapeHtml(category)}</span>
</div>
<h3 class="font-headline-xl text-[24px] md:text-[32px] mb-4 md:mb-6 text-white group-hover:text-silver transition-colors duration-500 break-words">${escapeHtml(project.title)}</h3>
<p class="text-silver/50 font-body-md max-w-lg leading-relaxed">${escapeHtml(project.summary)}</p>
</a>
</article>`;
}

function homepageSection(featured, labels) {
  const cards = featured.map((project, index) => homepageCard(project, index, labels)).join('\n');
  return `<section id="selected-work" class="py-section-gap-mobile md:py-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto reveal" aria-labelledby="selected-work-heading">
<h2 id="selected-work-heading" class="font-display-xl text-[36px] md:text-[56px] mb-10 md:mb-16 reveal text-white">Selected Work</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
${cards}
</div>
<p class="mt-12 md:mt-16"><a class="font-label-md text-label-md uppercase tracking-widest text-silver/60 hover:text-white transition-colors duration-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-white" href="/work/">All work</a></p>
</section>`;
}

export function readHomepageConfig(root = ROOT) {
  const configPath = join(root, 'data', 'homepage.json');
  let raw;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    throw new Error('data/homepage.json could not be read');
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('data/homepage.json is not valid JSON');
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('data/homepage.json must be an object');
  }
  for (const key of Object.keys(data)) {
    if (key !== 'showWork') throw new Error('data/homepage.json contains an unknown field');
  }
  if (typeof data.showWork !== 'boolean') throw new Error('data/homepage.json showWork must be true or false');
  return { showWork: data.showWork };
}

function setHomepageNavMode(html, wide) {
  const pairs = [
    ['class="hidden md:flex items-center gap-10"', 'class="hidden xl:flex items-center gap-10"'],
    ['class="md:hidden flex items-center justify-center w-10 h-10 text-white" id="mobile-menu-btn"', 'class="xl:hidden flex items-center justify-center w-10 h-10 text-white" id="mobile-menu-btn"'],
    ['class="hidden md:inline-flex items-center border border-white/20', 'class="hidden xl:inline-flex items-center border border-white/20'],
    ['class="md:hidden fixed inset-0 z-[60]" id="mobile-menu"', 'class="xl:hidden fixed inset-0 z-[60]" id="mobile-menu"'],
    ['if (window.innerWidth >= 768) closeMenu();', 'if (window.innerWidth >= 1280) closeMenu();'],
  ];
  let next = html;
  for (const [compact, expanded] of pairs) {
    const hasCompact = next.includes(compact);
    const hasExpanded = next.includes(expanded);
    if (!hasCompact && !hasExpanded) {
      if (next.includes('id="mobile-menu-btn"')) throw new Error('homepage navigation markup no longer matches the Work activation');
      continue;
    }
    const from = wide ? compact : expanded;
    const to = wide ? expanded : compact;
    if (!next.includes(from)) continue;
    if (next.split(from).length !== 2) throw new Error('homepage navigation markup is ambiguous');
    next = next.replace(from, to);
  }
  return next;
}

export function renderHomepage(html, config, data) {
  if (!config || typeof config.showWork !== 'boolean') throw new Error('homepage showWork must be true or false');
  const { labels, published } = publishedProjects(data);
  const featured = published.filter((project) => project.featured === true);
  const showNav = config.showWork === true;
  const showSection = showNav && featured.length > 0;
  let next = html;
  next = replaceHomeMarker(next, 'desktop', showNav ? homepageNavLink('desktop') : '');
  next = replaceHomeMarker(next, 'mobile', showNav ? homepageNavLink('mobile') : '');
  next = replaceHomeMarker(next, 'footer', showNav ? homepageNavLink('footer') : '');
  next = replaceHomeMarker(next, 'section', showSection ? homepageSection(featured, labels) : '');
  next = setHomepageNavMode(next, showNav);
  if (!showNav && (next.includes('href="/work/"') || next.includes('id="selected-work"'))) {
    throw new Error('homepage still exposes Work while showWork is false');
  }
  if (!showSection && next.includes('id="selected-work"')) {
    throw new Error('homepage still contains Selected Work without a featured published project');
  }
  if (Array.isArray(data.projects)) {
    for (const project of data.projects) {
      if (project && project.clientVisibility === 'confidential' && present(project.clientName)) {
        throw new Error('homepage refused a confidential client name');
      }
    }
  }
  return next;
}

function generateValidated(data, outDir, loadErrors = []) {
  assertSafeOutDir(outDir);
  if (loadErrors.length > 0) {
    console.error('Refusing to generate because the portfolio content could not be loaded.');
    for (const error of loadErrors) console.error(`- ${error}`);
    return 1;
  }
  const result = validatePortfolioData(data);
  if (!result.ok) {
    console.error('Refusing to generate because the portfolio data did not validate.');
    for (const error of result.errors) console.error(`- ${error}`);
    return 1;
  }
  const files = renderWorkSite(data);
  writeWorkSite(outDir, files);
  console.log(`Generated ${files.length} file(s).`);
  for (const file of files) console.log(file.relativePath);
  return 0;
}

function generateFromFile(dataPath, outDir) {
  return generateValidated(readPortfolio(dataPath), outDir);
}

function generateFromRepository(outDir) {
  const loaded = loadPortfolio(ROOT);
  const updatingHome = resolve(outDir) === resolve(DEFAULT_OUT);
  let homepageConfig = null;
  if (updatingHome) {
    try {
      homepageConfig = readHomepageConfig(ROOT);
    } catch (error) {
      console.error(error.message || 'homepage configuration could not be read');
      return 1;
    }
  }
  if (!loaded.ok || !loaded.data) return generateValidated(loaded.data, outDir, loaded.errors);
  const result = validatePortfolioData(loaded.data);
  if (!result.ok) {
    console.error('Refusing to generate because the portfolio data did not validate.');
    for (const error of result.errors) console.error(`- ${error}`);
    return 1;
  }
  let nextHome = null;
  if (updatingHome) {
    try {
      nextHome = renderHomepage(readFileSync(join(ROOT, 'index.html'), 'utf8'), homepageConfig, loaded.data);
    } catch (error) {
      console.error(error.message || 'homepage could not be prepared');
      return 1;
    }
  }
  let files;
  try {
    files = renderWorkSite(loaded.data);
  } catch (error) {
    console.error(error.message || 'generation failed');
    return 1;
  }
  writeWorkSite(outDir, files);
  if (nextHome !== null) {
    const indexPath = join(ROOT, 'index.html');
    const current = readFileSync(indexPath, 'utf8');
    if (nextHome !== current) writeFileSync(indexPath, nextHome.endsWith('\n') ? nextHome : `${nextHome}\n`);
  }
  console.log(`Generated ${files.length} file(s).`);
  for (const file of files) console.log(file.relativePath);
  if (updatingHome) console.log(homepageConfig.showWork ? 'Homepage Work is active.' : 'Homepage Work is inactive.');
  return 0;
}

if (isDirectRun()) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const code = args.dataPath
      ? generateFromFile(args.dataPath, args.outDir)
      : generateFromRepository(args.outDir);
    process.exit(code);
  } catch (error) {
    console.error(error.message || 'generation failed');
    process.exit(1);
  }
}
