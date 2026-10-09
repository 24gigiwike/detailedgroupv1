#!/usr/bin/env node
/**
 * Fixture checks for homepage activation and portfolio generation.
 * Projects are built in memory or under the OS temp directory.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePortfolioData } from './validate-projects.mjs';
import { renderHomepage, renderWorkSite, writeWorkSite } from './generate-work.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const taxonomy = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8')).taxonomy;
const homeTemplate = `<nav>
<a href="#services">Services</a>
<!-- dg:home-work:desktop -->
<!-- /dg:home-work:desktop -->
<a href="#approach">Approach</a>
<!-- dg:home-work:mobile -->
<!-- /dg:home-work:mobile -->
<!-- dg:home-work:footer -->
<!-- /dg:home-work:footer -->
<!-- dg:home-work:section -->
<!-- /dg:home-work:section -->
</nav>
`;

const failures = [];
function check(name, condition, detail = '') {
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
  else console.log(`ok ${name}`);
}

function cover(alt = 'Square product still on a dark field') {
  return { src: '/social-preview.jpg', alt };
}

function project(overrides = {}) {
  return {
    id: 'alpha-project',
    slug: 'alpha-project',
    title: 'Alpha project',
    summary: 'A short approved summary.',
    category: 'organizational-storytelling',
    services: ['organizational-storytelling'],
    clientVisibility: 'public',
    featured: false,
    sortOrder: 1,
    status: 'published',
    coverImage: cover(),
    description: 'Overview copy.',
    ...overrides,
  };
}

function portfolio(projects) {
  return { schemaVersion: 1, taxonomy, projects };
}

function home(config, projects) {
  return renderHomepage(homeTemplate, config, portfolio(projects));
}

const hidden = home({ showWork: false }, []);
check('zero published stays hidden', !hidden.includes('href="/work/"') && !hidden.includes('id="selected-work"'));

const featured = project({ featured: true, title: 'Featured alpha', summary: 'Featured summary.' });
const gated = home({ showWork: false }, [featured]);
check('activation stays off with a featured project', !gated.includes('Featured alpha') && !gated.includes('href="/work/"'));

const one = home({ showWork: true }, [featured]);
check('one featured project renders', one.includes('id="selected-work"') && one.includes('Featured alpha') && one.includes('Featured summary.') && one.includes('Organizational Storytelling') && one.includes('href="/work/alpha-project/"') && one.includes('src="/social-preview.jpg"'));
check('one featured project adds Work navigation', one.indexOf('href="/work/"') !== -1 && one.indexOf('>Work</a>') < one.indexOf('href="#approach"'));

const quiet = project({
  id: 'quiet-project',
  slug: 'quiet-project',
  title: 'Quiet project',
  summary: 'Not featured.',
  sortOrder: 2,
  featured: false,
});
const many = home({ showWork: true }, [
  quiet,
  project({ id: 'second-feature', slug: 'second-feature', title: 'Second feature', sortOrder: 4, featured: true }),
  project({ id: 'first-feature', slug: 'first-feature', title: 'First feature', sortOrder: 3, featured: true }),
]);
check('homepage lists featured projects only', many.includes('First feature') && many.includes('Second feature') && !many.includes('Quiet project'));
check('featured projects keep sort order', many.indexOf('First feature') < many.indexOf('Second feature'));

const draftOnly = home({ showWork: true }, [project({
  status: 'draft',
  title: 'HIDDEN-DRAFT-TITLE',
  slug: 'hidden-draft',
  id: 'hidden-draft',
  featured: true,
  coverImage: null,
})]);
check('draft-only portfolio adds navigation without cards', draftOnly.includes('href="/work/"') && !draftOnly.includes('id="selected-work"') && !draftOnly.includes('HIDDEN-DRAFT-TITLE'));

const confidential = home({ showWork: true }, [project({
  id: 'confidential-client',
  slug: 'confidential-client',
  title: 'Anonymous communications project',
  summary: 'A sector description of the work.',
  clientVisibility: 'confidential',
  clientName: null,
  clientDescriptor: 'A personal-audio company',
  featured: true,
})]);
check('confidential card omits the legal name and descriptor', confidential.includes('Anonymous communications project') && !confidential.includes('A personal-audio company') && !confidential.includes('Secret Legal Name'));

let refused = false;
try {
  home({ showWork: true }, [project({
    clientVisibility: 'confidential',
    clientName: 'Secret Legal Name',
    clientDescriptor: 'A personal-audio company',
    featured: true,
  })]);
} catch (error) {
  refused = error.message.includes('confidential client name') && !error.message.includes('Secret Legal Name');
}
check('confidential name blocks homepage rendering', refused);

const escaped = home({ showWork: true }, [project({
  title: 'Title <script>alert(1)</script> & co',
  summary: 'Summary <em>raw</em>',
  featured: true,
  coverImage: cover('Alt <tag> & name'),
})]);
check('homepage card escapes html', escaped.includes('&lt;script&gt;') && escaped.includes('&amp;') && !escaped.includes('<script>alert'));

const rendered = renderWorkSite(portfolio([featured, quiet, project({
  id: 'hidden-draft',
  slug: 'hidden-draft',
  title: 'HIDDEN-DRAFT-TITLE',
  status: 'draft',
  featured: true,
  coverImage: null,
})]));
const paths = new Set(rendered.map((file) => file.relativePath));
check('generator writes published routes only', paths.has('index.html') && paths.has('alpha-project/index.html') && paths.has('quiet-project/index.html') && !paths.has('hidden-draft/index.html'));
const overview = rendered.find((file) => file.relativePath === 'index.html').html;
check('overview omits the draft', overview.includes('href="portfolio.css"') && overview.includes('/work/alpha-project/') && !overview.includes('HIDDEN-DRAFT-TITLE') && !overview.includes('hidden-draft'));

const invalid = validatePortfolioData(portfolio([project({
  coverImage: { src: 'http://example.com/a.jpg', alt: 'Remote still' },
})]));
check('invalid media is rejected', !invalid.ok && invalid.errors.some((error) => error.includes('coverImage.src')) && !invalid.errors.join('\n').includes('example.com'));

const dir = mkdtempSync(join(tmpdir(), 'dg-home-'));
const badOut = join(dir, 'bad');
const badFile = join(dir, 'bad.json');
writeFileSync(badFile, JSON.stringify(portfolio([project({ blocks: [{ type: 'carousel', text: 'nope' }] })])));
let badCode = 0;
try {
  execFileSync(process.execPath, [join(ROOT, 'scripts/generate-work.mjs'), '--data', badFile, '--out', badOut], { cwd: ROOT, stdio: 'pipe' });
} catch (error) {
  badCode = error.status;
}
check('invalid generation writes nothing', badCode === 1 && !existsSync(badOut));

const site = join(dir, 'site');
const workOut = join(site, 'work');
const first = portfolio([
  featured,
  project({ id: 'stale-project', slug: 'stale-project', title: 'STALE-PROJECT', sortOrder: 8 }),
]);
writeWorkSite(workOut, renderWorkSite(first));
check('stale page exists before unpublishing', existsSync(join(workOut, 'stale-project/index.html')));
writeWorkSite(workOut, renderWorkSite(portfolio([featured])));
check('unpublishing removes the stale route', !existsSync(join(workOut, 'stale-project/index.html')) && existsSync(join(workOut, 'alpha-project/index.html')));
mkdirSync(join(workOut, 'design-system'));
writeFileSync(join(workOut, 'design-system', 'index.html'), '<!-- detailed-group:generated-work -->\nkeep-demo');
writeWorkSite(workOut, renderWorkSite(portfolio([featured])));
check('design exploration survives regeneration', readFileSync(join(workOut, 'design-system', 'index.html'), 'utf8').includes('keep-demo'));

const realIndex = readFileSync(join(ROOT, 'index.html'), 'utf8');
const realData = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8'));
const homepageConfig = JSON.parse(readFileSync(join(ROOT, 'data/homepage.json'), 'utf8'));
const content = JSON.parse(readFileSync(join(ROOT, 'content/projects/orivs-ouro-integrated-communications-ecosystem.json'), 'utf8'));
realData.projects = [content];
const activeReal = renderHomepage(realIndex, { showWork: true }, realData);
const inactive = renderHomepage(activeReal, { showWork: false }, realData);
check('draft stays off the real homepage', !activeReal.includes('ORIVS') && !activeReal.includes('OURO') && !inactive.includes('ORIVS') && !activeReal.includes('id="selected-work"'));
check('active homepage has Work without an empty section', activeReal.includes('href="/work/"') && activeReal.includes('class="hidden xl:flex items-center gap-10"') && activeReal.includes('if (window.innerWidth >= 1280) closeMenu();'));
check('withdrawing Work removes the public links', !inactive.includes('href="/work/"') && inactive.includes('class="hidden md:flex items-center gap-10"') && inactive.includes('if (window.innerWidth >= 768) closeMenu();'));
check('committed homepage matches showWork', homepageConfig.showWork ? activeReal === realIndex : inactive === renderHomepage(realIndex, { showWork: false }, realData) && realIndex === inactive);
const emptyOverview = renderWorkSite(portfolio([])).find((file) => file.relativePath === 'index.html').html;
const detailHtml = rendered.find((file) => file.relativePath === 'alpha-project/index.html').html;
check('empty overview stays noindex', emptyOverview.includes('content="noindex, follow"') && emptyOverview.includes('Case studies will be published here.') && !emptyOverview.includes('HIDDEN-DRAFT-TITLE'));
check('work overview links to the design prototype', emptyOverview.includes('href="/work/design-system/"') && emptyOverview.includes('Design System') && overview.includes('href="/work/design-system/"'));
const reservedDemo = validatePortfolioData(portfolio([project({ id: 'design-system', slug: 'design-system', title: 'Reserved path' })]));
check('design-system slug is reserved', !reservedDemo.ok && reservedDemo.errors.some((error) => error.includes('reserved')) && !reservedDemo.errors.join('\n').includes('Reserved path'));
check('published overview is indexable', overview.includes('content="index, follow"') && overview.includes('rel="canonical" href="https://www.detailedgroup.co/work/"') && !overview.includes('noindex'));
check('detail page has a canonical url', detailHtml.includes('rel="canonical" href="https://www.detailedgroup.co/work/alpha-project/"') && detailHtml.includes('content="index, follow"') && !detailHtml.includes('HIDDEN-DRAFT-TITLE'));

writeFileSync(join(site, 'index.html'), one);
const server = spawn('python3', ['-m', 'http.server', '8944', '--bind', '127.0.0.1'], { cwd: site, stdio: 'ignore' });
function fetchPath(path) {
  return fetch(`http://127.0.0.1:8944${path}`).then(async (response) => ({
    status: response.status,
    body: await response.text(),
  }));
}
await new Promise((resolve) => setTimeout(resolve, 300));
try {
  const root = await fetchPath('/');
  const work = await fetchPath('/work/');
  const workRefresh = await fetchPath('/work/');
  const detail = await fetchPath('/work/alpha-project/');
  const detailRefresh = await fetchPath('/work/alpha-project/');
  const missing = await fetchPath('/work/missing/');
  const css = await fetchPath('/work/portfolio.css');
  check('homepage route', root.status === 200 && root.body.includes('id="selected-work"'));
  check('work directory index', work.status === 200 && work.body.includes('href="portfolio.css"') && work.body.includes('Featured alpha'));
  check('work refresh', workRefresh.status === 200 && workRefresh.body === work.body);
  check('case-study directory index', detail.status === 200 && detail.body.includes('href="../portfolio.css"') && detail.body.includes('Featured alpha'));
  check('case-study refresh', detailRefresh.status === 200 && detailRefresh.body.includes('Featured alpha'));
  check('missing case study stays missing', missing.status === 404 && !missing.body.includes('Featured alpha') && !missing.body.includes('Selected Work'));
  check('shared stylesheet route', css.status === 200 && css.body.includes('.cs-card'));
} finally {
  server.kill();
  rmSync(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('\nFAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('\nHomepage fixture checks passed.');
