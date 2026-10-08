#!/usr/bin/env node
/**
 * Dependency-free validator for data/projects.json.
 * Competency values are read from the file. They are not hardcoded.
 * Error text identifies the project index and field. It does not print
 * client names, logos, or other free-text field values.
 */
import { pathToFileURL } from 'node:url';
import { loadPortfolio } from './load-projects.mjs';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const RESERVED_SLUGS = new Set([
  'index',
  'work',
  'api',
  'data',
  'assets',
  'images',
  'favicon_io',
  'privacy',
  'terms',
  'insights',
  'scripts',
  'docs',
]);

const TOP_LEVEL_KEYS = new Set(['schemaVersion', 'taxonomy', 'projects', 'contentRoot']);
const TAXONOMY_KEYS = new Set(['competencies']);
const COMPETENCY_KEYS = new Set(['value', 'label']);
const PROJECT_KEYS = new Set([
  'id',
  'slug',
  'title',
  'summary',
  'description',
  'category',
  'services',
  'industry',
  'clientVisibility',
  'clientName',
  'clientDescriptor',
  'clientLogo',
  'challenge',
  'approach',
  'solution',
  'outcomes',
  'coverImage',
  'heroImage',
  'gallery',
  'videoUrl',
  'featured',
  'sortOrder',
  'status',
  'completionDate',
  'seoTitle',
  'seoDescription',
  'ogImage',
  'blocks',
]);
const MEDIA_KEYS = new Set(['src', 'alt', 'caption']);
const ALWAYS_REQUIRED = ['id', 'slug', 'title', 'clientVisibility', 'featured', 'sortOrder', 'status'];
const PUBLISHED_REQUIRED = ['summary', 'category', 'services', 'coverImage'];
const BLOCK_TYPES = new Set(['narrative', 'image', 'gallery', 'image-pair', 'video', 'heading', 'quote', 'workstream']);
const BLOCK_KEYS = {
  narrative: new Set(['type', 'text']),
  image: new Set(['type', 'src', 'alt', 'caption']),
  gallery: new Set(['type', 'images']),
  'image-pair': new Set(['type', 'primary', 'secondary']),
  video: new Set(['type', 'url', 'caption']),
  heading: new Set(['type', 'text']),
  quote: new Set(['type', 'text', 'attribution', 'role']),
  workstream: new Set(['type', 'title', 'summary', 'text']),
};
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/;
const RAW_HTML = /<[a-z!/?]/i;
const OPTIONAL_TEXT_FIELDS = [
  'summary',
  'description',
  'industry',
  'clientName',
  'clientDescriptor',
  'challenge',
  'approach',
  'solution',
  'outcomes',
  'videoUrl',
  'seoTitle',
  'seoDescription',
];
const OPTIONAL_MEDIA_FIELDS = ['coverImage', 'heroImage', 'clientLogo', 'ogImage'];
const TEXT_LIMITS = {
  id: 80,
  slug: 80,
  title: 140,
  summary: 400,
  description: 8000,
  industry: 80,
  clientName: 120,
  clientDescriptor: 200,
  challenge: 4000,
  approach: 4000,
  solution: 4000,
  outcomes: 4000,
  seoTitle: 70,
  seoDescription: 200,
  alt: 300,
  caption: 300,
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPresent(value) {
  return value !== undefined && value !== null;
}

function unknownKeys(value, allowed) {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function projectLabel(index) {
  return `projects[${index}]`;
}

function isValidDate(value) {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function urlProblem(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    return 'must be a site-root path or an https URL';
  }
  if (value.startsWith('//') || value.includes('\\') || value.includes('..') || /\s/.test(value)) {
    return 'must not use protocol-relative, traversal, or whitespace URLs';
  }
  if (/[<>]/.test(value)) {
    return 'must not contain angle brackets';
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return 'must be a valid https URL';
    }
    if (url.username || url.password) {
      return 'must not include URL credentials';
    }
    if (url.protocol !== 'https:') {
      return 'must use https when absolute';
    }
    return null;
  }
  if (!value.startsWith('/')) {
    return 'must start with / or https:// so generated pages do not depend on relative paths';
  }
  return null;
}

function push(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function validateText(errors, path, value, { required = false, max = 4000, allowEmail = true } = {}) {
  if (!isPresent(value)) {
    if (required) push(errors, path, 'is required');
    return;
  }
  if (typeof value !== 'string') {
    push(errors, path, 'must be a string');
    return;
  }
  if (value.trim() === '' || value.trim() !== value) {
    push(errors, path, 'must be a non-empty trimmed string, or null when optional');
    return;
  }
  if (value.length > max) {
    push(errors, path, `must be ${max} characters or fewer`);
  }
  if (!allowEmail && EMAIL_RE.test(value)) {
    push(errors, path, 'must not contain an email address');
  }
}

function validateMedia(errors, path, value, { required = false, allowEmail = true } = {}) {
  if (!isPresent(value)) {
    if (required) push(errors, path, 'is required');
    return;
  }
  if (!isPlainObject(value)) {
    push(errors, path, 'must be an image object with src and alt');
    return;
  }
  for (const key of unknownKeys(value, MEDIA_KEYS)) {
    push(errors, `${path}.${key}`, 'is not an allowed image field');
  }
  if (!Object.hasOwn(value, 'src') || !Object.hasOwn(value, 'alt')) {
    push(errors, path, 'requires src and alt');
  }
  if (Object.hasOwn(value, 'src')) {
    if (typeof value.src !== 'string') {
      push(errors, `${path}.src`, 'must be a string');
    } else {
      const problem = urlProblem(value.src);
      if (problem) push(errors, `${path}.src`, problem);
      if (!allowEmail && EMAIL_RE.test(value.src)) {
        push(errors, `${path}.src`, 'must not contain an email address');
      }
    }
  }
  validateText(errors, `${path}.alt`, value.alt, { required: true, max: TEXT_LIMITS.alt, allowEmail });
  if (typeof value.src === 'string' && typeof value.alt === 'string') {
    const filename = value.src.split('/').pop()?.split('?')[0]?.toLowerCase();
    if (filename && value.alt.trim().toLowerCase() === filename) {
      push(errors, `${path}.alt`, 'must describe the image instead of repeating the filename');
    }
  }
  if (Object.hasOwn(value, 'caption')) {
    validateText(errors, `${path}.caption`, value.caption, { required: true, max: TEXT_LIMITS.caption, allowEmail });
  }
}

function validateCompetencies(data, errors) {
  if (!isPlainObject(data.taxonomy)) {
    push(errors, 'taxonomy', 'must be an object');
    return [];
  }
  for (const key of unknownKeys(data.taxonomy, TAXONOMY_KEYS)) {
    push(errors, `taxonomy.${key}`, 'is not an allowed taxonomy field');
  }
  const competencies = data.taxonomy.competencies;
  if (!Array.isArray(competencies) || competencies.length === 0) {
    push(errors, 'taxonomy.competencies', 'must be a non-empty array');
    return [];
  }
  const values = [];
  const seenValues = new Set();
  const seenLabels = new Set();
  competencies.forEach((entry, index) => {
    const path = `taxonomy.competencies[${index}]`;
    if (!isPlainObject(entry)) {
      push(errors, path, 'must be an object with value and label');
      return;
    }
    for (const key of unknownKeys(entry, COMPETENCY_KEYS)) {
      push(errors, `${path}.${key}`, 'is not an allowed competency field');
    }
    if (typeof entry.value !== 'string' || !SLUG_RE.test(entry.value)) {
      push(errors, `${path}.value`, 'must be lowercase kebab-case');
    } else if (seenValues.has(entry.value)) {
      push(errors, `${path}.value`, 'is duplicated');
    } else {
      seenValues.add(entry.value);
      values.push(entry.value);
    }
    if (typeof entry.label !== 'string' || entry.label.trim() === '' || entry.label.trim() !== entry.label) {
      push(errors, `${path}.label`, 'must be a non-empty trimmed label');
    } else if (seenLabels.has(entry.label)) {
      push(errors, `${path}.label`, 'is duplicated');
    } else {
      seenLabels.add(entry.label);
    }
  });
  return values;
}

function validateMarkdown(errors, path, value, allowEmail) {
  validateText(errors, path, value, { required: true, max: 8000, allowEmail });
  if (typeof value !== 'string') return;
  if (RAW_HTML.test(value)) push(errors, path, 'must not contain raw HTML');
  if (MARKDOWN_IMAGE.test(value)) push(errors, path, 'must not contain markdown images; use an image block');
  const linkRe = /\[[^\]]*\]\(([^)]*)\)/g;
  let match;
  while ((match = linkRe.exec(value)) !== null) {
    const problem = urlProblem(match[1]);
    if (problem) push(errors, path, 'links must be site-root paths or https URLs');
  }
}

function validateVideoUrl(errors, path, value, allowEmail) {
  if (typeof value !== 'string') {
    push(errors, path, 'must be a string');
    return;
  }
  const problem = urlProblem(value);
  if (problem) push(errors, path, problem);
  else if (!value.startsWith('https://')) push(errors, path, 'must be an https URL');
  if (!allowEmail && typeof value === 'string' && EMAIL_RE.test(value)) {
    push(errors, path, 'must not contain an email address');
  }
}

function validateBlock(block, index, errors, label, allowEmail) {
  const path = `${label}.blocks[${index}]`;
  if (!isPlainObject(block)) {
    push(errors, path, 'must be an object');
    return;
  }
  if (!BLOCK_TYPES.has(block.type)) {
    push(errors, `${path}.type`, 'must be a supported content block');
    return;
  }
  for (const key of unknownKeys(block, BLOCK_KEYS[block.type])) {
    push(errors, `${path}.${key}`, 'is not allowed on this block');
  }
  if (block.type === 'narrative' || block.type === 'heading') {
    validateMarkdown(errors, `${path}.text`, block.text, allowEmail);
  }
  if (block.type === 'image') {
    const image = { src: block.src, alt: block.alt };
    if (Object.hasOwn(block, 'caption')) image.caption = block.caption;
    validateMedia(errors, path, image, { required: true, allowEmail });
  }
  if (block.type === 'gallery') {
    if (!Array.isArray(block.images) || block.images.length === 0) {
      push(errors, `${path}.images`, 'must contain at least one image');
    } else if (block.images.length > 24) {
      push(errors, `${path}.images`, 'must contain 24 images or fewer');
    } else {
      block.images.forEach((image, imageIndex) => {
        validateMedia(errors, `${path}.images[${imageIndex}]`, image, { required: true, allowEmail });
      });
    }
  }
  if (block.type === 'image-pair') {
    validateMedia(errors, `${path}.primary`, block.primary, { required: true, allowEmail });
    validateMedia(errors, `${path}.secondary`, block.secondary, { required: true, allowEmail });
  }
  if (block.type === 'video') {
    if (!Object.hasOwn(block, 'url')) push(errors, `${path}.url`, 'is required');
    else validateVideoUrl(errors, `${path}.url`, block.url, allowEmail);
    if (Object.hasOwn(block, 'caption') && block.caption !== null) {
      validateText(errors, `${path}.caption`, block.caption, { required: true, max: TEXT_LIMITS.caption, allowEmail });
    }
  }
  if (block.type === 'quote') {
    validateMarkdown(errors, `${path}.text`, block.text, allowEmail);
    for (const field of ['attribution', 'role']) {
      if (!Object.hasOwn(block, field) || block[field] === null) continue;
      validateText(errors, `${path}.${field}`, block[field], { required: true, max: 160, allowEmail });
    }
  }
  if (block.type === 'workstream') {
    validateText(errors, `${path}.title`, block.title, { required: true, max: 140, allowEmail });
    validateText(errors, `${path}.summary`, block.summary, { required: true, max: 400, allowEmail });
    if (Object.hasOwn(block, 'text') && block.text !== null) {
      validateMarkdown(errors, `${path}.text`, block.text, allowEmail);
    }
  }
}

function validateProject(project, index, errors, competencyValues, seenIds, seenSlugs, seenSortOrders) {
  const label = projectLabel(index);
  if (!isPlainObject(project)) {
    push(errors, label, 'must be an object');
    return;
  }

  for (const key of unknownKeys(project, PROJECT_KEYS)) {
    push(errors, `${label}.${key}`, 'is not an allowed project field');
  }
  for (const key of ALWAYS_REQUIRED) {
    if (!Object.hasOwn(project, key)) push(errors, `${label}.${key}`, 'is required');
  }

  const confidential = project.clientVisibility === 'confidential';
  const allowEmail = !confidential;

  if (Object.hasOwn(project, 'id')) {
    validateText(errors, `${label}.id`, project.id, { required: true, max: TEXT_LIMITS.id, allowEmail });
  }
  if (typeof project.id === 'string' && project.id.trim() !== '') {
    if (!SLUG_RE.test(project.id)) {
      push(errors, `${label}.id`, 'must be lowercase kebab-case');
    } else if (seenIds.has(project.id)) {
      push(errors, `${label}.id`, 'is duplicated');
    } else {
      seenIds.add(project.id);
    }
  }

  if (Object.hasOwn(project, 'slug')) {
    validateText(errors, `${label}.slug`, project.slug, { required: true, max: TEXT_LIMITS.slug, allowEmail });
  }
  if (typeof project.slug === 'string' && project.slug.trim() !== '') {
    if (!SLUG_RE.test(project.slug)) {
      push(errors, `${label}.slug`, 'must be lowercase kebab-case');
    } else if (RESERVED_SLUGS.has(project.slug)) {
      push(errors, `${label}.slug`, 'uses a reserved path');
    } else if (seenSlugs.has(project.slug)) {
      push(errors, `${label}.slug`, 'is duplicated');
    } else {
      seenSlugs.add(project.slug);
    }
  }

  if (Object.hasOwn(project, 'title')) {
    validateText(errors, `${label}.title`, project.title, { required: true, max: TEXT_LIMITS.title, allowEmail });
  }

  if (!Object.hasOwn(project, 'clientVisibility')) {
    // already reported
  } else if (project.clientVisibility !== 'public' && project.clientVisibility !== 'confidential') {
    push(errors, `${label}.clientVisibility`, 'must be "public" or "confidential"');
  }

  if (!Object.hasOwn(project, 'status')) {
    // already reported
  } else if (project.status !== 'draft' && project.status !== 'published') {
    push(errors, `${label}.status`, 'must be "draft" or "published"');
  }

  if (!Object.hasOwn(project, 'featured')) {
    // already reported
  } else if (typeof project.featured !== 'boolean') {
    push(errors, `${label}.featured`, 'must be a boolean');
  }

  if (!Object.hasOwn(project, 'sortOrder')) {
    // already reported
  } else if (!Number.isInteger(project.sortOrder) || project.sortOrder < 0) {
    push(errors, `${label}.sortOrder`, 'must be an integer greater than or equal to 0');
  } else if (seenSortOrders.has(project.sortOrder)) {
    push(errors, `${label}.sortOrder`, 'is duplicated; featured ordering must be unique');
  } else {
    seenSortOrders.add(project.sortOrder);
  }

  if (confidential) {
    if (isPresent(project.clientName)) {
      push(errors, `${label}.clientName`, 'must be omitted or null when clientVisibility is "confidential"');
    }
    if (isPresent(project.clientLogo)) {
      push(errors, `${label}.clientLogo`, 'must be omitted or null when clientVisibility is "confidential"');
    }
  }

  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (!Object.hasOwn(project, field) || project[field] === null) continue;
    if (field === 'clientName' && confidential) continue;
    if (field === 'videoUrl') continue;
    validateText(errors, `${label}.${field}`, project[field], {
      required: true,
      max: TEXT_LIMITS[field] ?? 4000,
      allowEmail,
    });
  }

  if (Object.hasOwn(project, 'category') && project.category !== null) {
    if (typeof project.category !== 'string' || !competencyValues.includes(project.category)) {
      push(errors, `${label}.category`, 'must be one taxonomy.competencies value');
    }
  }

  if (Object.hasOwn(project, 'services') && project.services !== null) {
    if (!Array.isArray(project.services)) {
      push(errors, `${label}.services`, 'must be an array of competency values');
    } else {
      const seenServices = new Set();
      project.services.forEach((service, serviceIndex) => {
        const path = `${label}.services[${serviceIndex}]`;
        if (typeof service !== 'string' || !competencyValues.includes(service)) {
          push(errors, path, 'must be one taxonomy.competencies value');
          return;
        }
        if (seenServices.has(service)) push(errors, path, 'is duplicated');
        seenServices.add(service);
      });
      if (
        typeof project.category === 'string'
        && competencyValues.includes(project.category)
        && !seenServices.has(project.category)
      ) {
        push(errors, `${label}.services`, 'must include the primary category');
      }
    }
  }

  for (const field of OPTIONAL_MEDIA_FIELDS) {
    if (!Object.hasOwn(project, field) || project[field] === null) continue;
    if (field === 'clientLogo' && confidential) continue;
    validateMedia(errors, `${label}.${field}`, project[field], { required: true, allowEmail });
  }

  if (Object.hasOwn(project, 'gallery') && project.gallery !== null) {
    if (!Array.isArray(project.gallery)) {
      push(errors, `${label}.gallery`, 'must be an array of image objects');
    } else if (project.gallery.length > 24) {
      push(errors, `${label}.gallery`, 'must contain 24 images or fewer');
    } else {
      project.gallery.forEach((image, imageIndex) => {
        validateMedia(errors, `${label}.gallery[${imageIndex}]`, image, { required: true, allowEmail });
      });
    }
  }

  if (Object.hasOwn(project, 'videoUrl') && project.videoUrl !== null) {
    if (typeof project.videoUrl !== 'string') {
      push(errors, `${label}.videoUrl`, 'must be a string');
    } else {
      const problem = urlProblem(project.videoUrl);
      if (problem) push(errors, `${label}.videoUrl`, problem);
      else if (!project.videoUrl.startsWith('https://')) {
        push(errors, `${label}.videoUrl`, 'must be an https URL');
      }
      if (!allowEmail && EMAIL_RE.test(project.videoUrl)) {
        push(errors, `${label}.videoUrl`, 'must not contain an email address');
      }
    }
  }

  if (Object.hasOwn(project, 'completionDate') && project.completionDate !== null) {
    if (typeof project.completionDate !== 'string' || !isValidDate(project.completionDate)) {
      push(errors, `${label}.completionDate`, 'must be a real YYYY-MM-DD date');
    }
  }

  if (Object.hasOwn(project, 'blocks') && project.blocks !== null) {
    if (!Array.isArray(project.blocks)) {
      push(errors, `${label}.blocks`, 'must be an array');
    } else if (project.blocks.length > 40) {
      push(errors, `${label}.blocks`, 'must contain 40 blocks or fewer');
    } else {
      project.blocks.forEach((block, blockIndex) => {
        validateBlock(block, blockIndex, errors, label, allowEmail);
      });
    }
  }

  if (project.status === 'published') {
    for (const field of PUBLISHED_REQUIRED) {
      if (!isPresent(project[field])) push(errors, `${label}.${field}`, 'is required when status is "published"');
    }
    const hasBlocks = Array.isArray(project.blocks) && project.blocks.length > 0;
    if (!hasBlocks && !isPresent(project.description)) {
      push(errors, `${label}.description`, 'is required when status is "published" and no content blocks are present');
    }
    if (Array.isArray(project.services) && project.services.length === 0) {
      push(errors, `${label}.services`, 'must include at least one competency when status is "published"');
    }
    if (confidential && !isPresent(project.clientDescriptor)) {
      push(errors, `${label}.clientDescriptor`, 'is required for a published confidential project so the public page has an anonymous client description');
    }
  }
}

export function validatePortfolioData(data) {
  const errors = [];
  if (!isPlainObject(data)) {
    return { ok: false, errors: ['root: must be an object'] };
  }
  for (const key of unknownKeys(data, TOP_LEVEL_KEYS)) {
    push(errors, key, 'is not an allowed top-level field');
  }
  if (data.schemaVersion !== 1) push(errors, 'schemaVersion', 'must be 1');
  if (Object.hasOwn(data, 'contentRoot')) {
    const root = data.contentRoot;
    if (typeof root !== 'string' || root.trim() !== root || root === '' || root.startsWith('/') || root.includes('\\') || root.split('/').includes('..')) {
      push(errors, 'contentRoot', 'must be a relative directory inside the repository');
    }
  }
  const competencyValues = validateCompetencies(data, errors);
  if (!Array.isArray(data.projects)) {
    push(errors, 'projects', 'must be an array');
  } else {
    const seenIds = new Set();
    const seenSlugs = new Set();
    const seenSortOrders = new Set();
    data.projects.forEach((project, index) => {
      validateProject(project, index, errors, competencyValues, seenIds, seenSlugs, seenSortOrders);
    });
  }
  return { ok: errors.length === 0, errors };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

function summarize(data) {
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const published = projects.filter((project) => project && project.status === 'published');
  const drafts = projects.filter((project) => project && project.status === 'draft');
  const competencies = data.taxonomy && Array.isArray(data.taxonomy.competencies)
    ? data.taxonomy.competencies.length
    : 0;
  return {
    schemaVersion: data.schemaVersion,
    competencies,
    projects: projects.length,
    published: published.length,
    drafts: drafts.length,
    featuredPublished: published.filter((project) => project.featured === true).length,
  };
}

if (isDirectRun()) {
  const loaded = loadPortfolio();
  if (!loaded.ok) {
    console.error('Result: invalid');
    for (const error of loaded.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  const result = validatePortfolioData(loaded.data);
  const summary = summarize(loaded.data);
  console.log('Validated portfolio content');
  console.log(`schemaVersion: ${summary.schemaVersion}`);
  console.log(`competencies: ${summary.competencies}`);
  console.log(`projects: ${summary.projects}`);
  console.log(`published: ${summary.published}`);
  console.log(`drafts: ${summary.drafts}`);
  console.log(`featured published: ${summary.featuredPublished}`);
  console.log(`content files: ${loaded.contentFiles}`);
  if (!result.ok) {
    console.error(`Result: invalid (${result.errors.length})`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('Result: valid');
}
