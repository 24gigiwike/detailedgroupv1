#!/usr/bin/env node
/**
 * Confirm the committed public pages agree with the portfolio rules.
 * Drafts stay out of the homepage and /work/. Homepage Work stays omitted
 * while data/homepage.json sets showWork to false.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPortfolio } from './load-projects.mjs';
import { readHomepageConfig } from './generate-work.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

const loaded = loadPortfolio(ROOT);
if (!loaded.ok || !loaded.data) {
  for (const error of loaded.errors || ['portfolio content could not be loaded']) fail(error);
} else {
  const homepage = readHomepageConfig(ROOT);
  const index = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const workIndexPath = join(ROOT, 'work', 'index.html');
  if (!existsSync(workIndexPath)) fail('work/index.html is missing');
  const workIndex = existsSync(workIndexPath) ? readFileSync(workIndexPath, 'utf8') : '';
  const cssSource = readFileSync(join(ROOT, 'assets', 'portfolio.css'), 'utf8');
  const cssCopy = existsSync(join(ROOT, 'work', 'portfolio.css'))
    ? readFileSync(join(ROOT, 'work', 'portfolio.css'), 'utf8')
    : '';
  const expectedCss = cssSource.endsWith('\n') ? cssSource : `${cssSource}\n`;
  if (cssCopy !== expectedCss) fail('work/portfolio.css does not match assets/portfolio.css');
  if (!workIndex.includes('detailed-group:generated-work')) fail('work/index.html is missing the generator marker');
  if (!workIndex.includes('href="portfolio.css"')) fail('work overview is missing its stylesheet link');

  for (const name of ['desktop', 'mobile', 'footer', 'section']) {
    if (!index.includes(`<!-- dg:home-work:${name} -->`) || !index.includes(`<!-- /dg:home-work:${name} -->`)) {
      fail(`homepage is missing the ${name} work marker`);
    }
  }

  const projects = Array.isArray(loaded.data.projects) ? loaded.data.projects : [];
  const published = projects.filter((project) => project && project.status === 'published');
  const drafts = projects.filter((project) => project && project.status === 'draft');
  const workDirs = existsSync(join(ROOT, 'work'))
    ? readdirSync(join(ROOT, 'work'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    : [];

  for (const project of published) {
    const page = join(ROOT, 'work', project.slug, 'index.html');
    if (!existsSync(page)) {
      fail(`published project ${project.slug} has no generated page`);
      continue;
    }
    const html = readFileSync(page, 'utf8');
    if (!html.includes('href="../portfolio.css"')) fail(`${project.slug} is missing its stylesheet link`);
    if (!html.includes('detailed-group:generated-work')) fail(`${project.slug} is missing the generator marker`);
  }

  const publishedSlugs = new Set(published.map((project) => project.slug));
  for (const dir of workDirs) {
    if (!publishedSlugs.has(dir)) fail(`work/${dir}/ is not a published project`);
  }

  const publicHtml = [index, workIndex];
  for (const dir of workDirs) {
    const page = join(ROOT, 'work', dir, 'index.html');
    if (existsSync(page)) publicHtml.push(readFileSync(page, 'utf8'));
  }
  const combined = publicHtml.join('\n');
  for (const project of drafts) {
    if (combined.includes(project.slug)) fail(`draft slug ${project.slug} appears in public HTML`);
    if (project.title && combined.includes(project.title)) fail('a draft title appears in public HTML');
  }

  if (homepage.showWork === false) {
    if (index.includes('href="/work/"')) fail('homepage links to /work/ while showWork is false');
    if (index.includes('id="selected-work"')) fail('homepage contains Selected Work while showWork is false');
  }
}

if (failures.length > 0) {
  console.error('Published output check failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Published output check passed.');
