/**
 * Load the portfolio catalog and individual Pages CMS project files.
 * Project records in content/projects are the source of truth when present.
 * data/projects.json keeps the taxonomy and must not also list projects.
 */
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;

function push(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function readJson(filePath, label, errors) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    push(errors, label, 'could not be read');
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    push(errors, label, 'is not valid JSON');
    return null;
  }
}

function isInside(root, target) {
  const rel = relative(resolve(root), resolve(target));
  return rel === '' || (rel !== '' && !rel.startsWith('..') && !rel.includes(`..${sep}`));
}

export function loadPortfolio(root = ROOT) {
  const errors = [];
  const catalogPath = join(root, 'data', 'projects.json');
  const catalog = readJson(catalogPath, 'data/projects.json', errors);
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    return { ok: false, errors, data: null, contentFiles: 0 };
  }

  const contentRoot = typeof catalog.contentRoot === 'string' ? catalog.contentRoot : 'content/projects';
  const contentSegments = contentRoot.split('/');
  if (
    contentRoot === ''
    || contentRoot.startsWith('/')
    || contentRoot.includes('\\')
    || contentSegments.includes('..')
    || contentSegments.includes('')
  ) {
    push(errors, 'contentRoot', 'must be a relative directory inside the repository');
    return { ok: false, errors, data: null, contentFiles: 0 };
  }

  const contentDir = join(root, contentRoot);
  if (!isInside(root, contentDir)) {
    push(errors, 'contentRoot', 'must stay inside the repository');
    return { ok: false, errors, data: null, contentFiles: 0 };
  }

  const catalogProjects = Array.isArray(catalog.projects) ? catalog.projects : [];
  const fileProjects = [];
  if (existsSync(contentDir)) {
    const stat = lstatSync(contentDir);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      push(errors, contentRoot, 'must be a real directory');
    } else {
      const names = readdirSync(contentDir).filter((name) => name !== '.gitkeep').sort();
      for (const name of names) {
        if (!FILE_RE.test(name)) {
          push(errors, `${contentRoot}/${name}`, 'must use a lowercase kebab-case .json filename');
          continue;
        }
        const filePath = join(contentDir, name);
        if (lstatSync(filePath).isSymbolicLink()) {
          push(errors, `${contentRoot}/${name}`, 'must not be a link');
          continue;
        }
        const project = readJson(filePath, `${contentRoot}/${name}`, errors);
        if (project === null) continue;
        if (typeof project !== 'object' || Array.isArray(project)) {
          push(errors, `${contentRoot}/${name}`, 'must be a project object');
          continue;
        }
        const slug = name.slice(0, -'.json'.length);
        if (project.slug !== slug) {
          push(errors, `${contentRoot}/${name}`, 'filename must match the slug field');
        }
        if (!Object.hasOwn(project, 'id')) project.id = slug;
        fileProjects.push(normalizeProject(project, catalog));
      }
    }
  }

  if (fileProjects.length > 0 && catalogProjects.length > 0) {
    push(errors, 'projects', `use ${contentRoot} files or data/projects.json, not both`);
  }

  const data = {
    schemaVersion: catalog.schemaVersion,
    taxonomy: catalog.taxonomy,
    projects: fileProjects.length > 0 ? fileProjects : catalog.projects,
  };
  if (typeof catalog.contentRoot === 'string') data.contentRoot = catalog.contentRoot;

  return {
    ok: errors.length === 0,
    errors,
    contentFiles: fileProjects.length,
    data,
  };
}

function competencyLookup(catalog) {
  const byLabel = new Map();
  const competencies = catalog && catalog.taxonomy && Array.isArray(catalog.taxonomy.competencies)
    ? catalog.taxonomy.competencies
    : [];
  for (const entry of competencies) {
    if (entry && typeof entry.label === 'string' && typeof entry.value === 'string') {
      byLabel.set(entry.label, entry.value);
    }
  }
  return byLabel;
}

function normalizeToken(value, labels) {
  if (typeof value !== 'string') return value;
  return labels.get(value) || value;
}

function normalizeString(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeImage(value) {
  if (!isRecord(value)) return value;
  const next = { ...value };
  if (typeof next.src === 'string') next.src = normalizeString(next.src);
  if (typeof next.alt === 'string') next.alt = normalizeString(next.alt);
  if (typeof next.caption === 'string') next.caption = normalizeString(next.caption);
  if (next.caption === null) delete next.caption;
  if (next.src === null && next.alt === null) return null;
  return next;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeDate(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(trimmed);
  return match ? match[1] : trimmed;
}

function normalizeInteger(value) {
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) return Number(value);
  return value;
}

function normalizeBlock(block) {
  if (!isRecord(block)) return block;
  const next = { ...block };
  for (const key of ['text', 'title', 'summary', 'url', 'attribution', 'role', 'caption', 'alt', 'src']) {
    if (typeof next[key] === 'string') next[key] = normalizeString(next[key]);
  }
  if (next.type === 'image') {
    const image = normalizeImage(next);
    if (image && image !== next) return image;
  }
  if (next.type === 'image-pair') {
    next.primary = normalizeImage(next.primary);
    next.secondary = normalizeImage(next.secondary);
  }
  if (next.type === 'gallery' && Array.isArray(next.images)) {
    next.images = next.images.map((image) => normalizeImage(image));
  }
  for (const key of ['text', 'caption', 'attribution', 'role']) {
    if (next[key] === null) delete next[key];
  }
  return next;
}

function normalizeProject(project, catalog) {
  if (!isRecord(project)) return project;
  const next = { ...project };
  const labels = competencyLookup(catalog);
  for (const key of Object.keys(next)) {
    if (typeof next[key] === 'string' && key !== 'completionDate') next[key] = normalizeString(next[key]);
  }
  if (Object.hasOwn(next, 'sortOrder')) next.sortOrder = normalizeInteger(next.sortOrder);
  if (Object.hasOwn(next, 'completionDate')) {
    next.completionDate = normalizeDate(next.completionDate);
    if (next.completionDate === null) delete next.completionDate;
  }
  if (Object.hasOwn(next, 'category')) next.category = normalizeToken(next.category, labels);
  if (Array.isArray(next.services)) {
    next.services = next.services.map((service) => normalizeToken(service, labels));
  }
  const visibility = { Public: 'public', Confidential: 'confidential' };
  const status = { Draft: 'draft', Published: 'published' };
  if (typeof next.clientVisibility === 'string' && visibility[next.clientVisibility]) {
    next.clientVisibility = visibility[next.clientVisibility];
  }
  if (typeof next.status === 'string' && status[next.status]) {
    next.status = status[next.status];
  }
  for (const key of ['coverImage', 'heroImage', 'clientLogo', 'ogImage']) {
    if (isRecord(next[key])) next[key] = normalizeImage(next[key]);
  }
  if (Array.isArray(next.gallery)) next.gallery = next.gallery.map((image) => normalizeImage(image));
  if (Array.isArray(next.blocks)) next.blocks = next.blocks.map((block) => normalizeBlock(block));
  return next;
}
