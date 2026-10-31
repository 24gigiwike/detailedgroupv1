import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { buildSite, copyStaticSite } from "../../site-build.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const testRoot = await mkdtemp(join(tmpdir(), "detailedgroup-site-build-"));
const sourceFixture = join(testRoot, "source");
const validDataDirectory = join(testRoot, "valid-data");
const publishedFixture = {
  title: "Test Project",
  slug: "test-project",
  shortDescription: "A temporary build-test case study.",
  coverImage: "https://example.test/cover.jpg",
  category: "Testing",
  status: "published",
  displayOrder: 2,
  overview: {
    heading: "Test project overview",
    intro: "Temporary overview intro.",
    body: "Temporary overview body.",
    heroMediaType: "image",
    heroMediaUrl: "https://example.test/overview.jpg"
  },
  brandIdentity: {
    enabled: true,
    heading: "Test brand identity",
    intro: "Temporary chapter intro.",
    body: "Temporary chapter body.",
    heroMediaType: "video",
    desktopHeroMediaUrl: "https://example.test/chapter.webm",
    gallery: []
  },
  launch: { enabled: false },
  eventBrandIdentity: { enabled: false },
  investorCommunications: { enabled: false }
};

async function writeRecord(directory, filename, record) {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), JSON.stringify(record, null, 2));
}

before(async () => {
  await mkdir(sourceFixture, { recursive: true });
  for (const entry of [
    "index.html", "insights.html", "privacy.html", "terms.html", "social-preview.jpg",
    "AURA-VISUALS.webm", "DETAILED ANIMATION.webm", "dgcube.webm", "detailed-clarity.jpeg",
    "exec.jpg", "exec-1600.jpg", "exec-1600.webp", "exec-960.jpg", "exec-960.webp",
    "assets", "favicon_io", "ouro", "data/marquee.json", "scripts/case-studies/assets/interactions.js"
  ]) {
    const source = join(repositoryRoot, entry);
    const destination = join(sourceFixture, entry);
    await mkdir(join(destination, ".."), { recursive: true });
    await cp(source, destination, { recursive: true });
  }
  await writeFile(join(sourceFixture, "data/marquee.json"), '{"items":[]}');
  await writeRecord(validDataDirectory, "test-project.json", publishedFixture);
  await writeRecord(validDataDirectory, "draft-project.json", {
    ...publishedFixture,
    title: "Draft Project",
    slug: "draft-project",
    status: "draft",
    displayOrder: 3
  });
  await writeRecord(validDataDirectory, "ouro.json", {
    ...publishedFixture,
    title: "OURO",
    slug: "ouro",
    status: "published",
    displayOrder: 1,
    brandIdentity: {
      ...publishedFixture.brandIdentity,
      heading: "OURO Brand Identity"
    },
    launch: { ...publishedFixture.brandIdentity, enabled: true },
    eventBrandIdentity: { ...publishedFixture.brandIdentity, enabled: true },
    investorCommunications: { ...publishedFixture.brandIdentity, enabled: true }
  });
});

after(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

test("assembles static site, published routes, legacy OURO routes, and assets", async () => {
  const outputDirectory = join(testRoot, "source", "dist");
  const result = await buildSite({
    sourceRoot: sourceFixture,
    dataDirectory: validDataDirectory,
    outputDirectory
  });
  assert.equal(result.generatedPageCount, 8);

  for (const route of [
    "ouro/index.html",
    "ouro/brand-identity/index.html",
    "ouro/launch/index.html",
    "ouro/event-brand-identity/index.html",
    "ouro/investor-communications/index.html"
  ]) {
    await readFile(join(outputDirectory, route), "utf8");
  }
  const overview = await readFile(join(outputDirectory, "case-studies/test-project/index.html"), "utf8");
  const chapter = await readFile(join(outputDirectory, "case-studies/test-project/brand-identity/index.html"), "utf8");
  const directory = await readFile(join(outputDirectory, "case-studies/index.html"), "utf8");
  assert.match(overview, /Test project overview/);
  assert.match(overview, /brand-identity\//);
  assert.doesNotMatch(overview, /launch\//);
  assert.match(chapter, /Test brand identity/);
  assert.doesNotMatch(chapter, /href="\/case-studies\/test-project\/launch\//);
  assert.match(directory, /Test Project/);
  assert.match(directory, /OURO/);
  assert.doesNotMatch(directory, /Draft Project/);
  await assert.rejects(readFile(join(outputDirectory, "case-studies/draft-project/index.html")));
  await assert.rejects(readFile(join(outputDirectory, "case-studies/test-project/launch/index.html")));
  await assert.rejects(readFile(join(outputDirectory, "case-studies/ouro/index.html")));

  for (const asset of [
    "index.html",
    "data/marquee.json",
    "assets/smooth-scroll.js",
    "favicon_io/favicon-32x32.png",
    "ouro/assets/ouro.css",
    "scripts/case-studies/assets/interactions.js"
  ]) {
    await readFile(join(outputDirectory, asset));
  }
  for (const excluded of [".git", ".pages.yml", "data/case-studies", "netlify.toml", "middleware.js", "api", "package.json"]) {
    await assert.rejects(readdir(join(outputDirectory, excluded)));
  }
  await writeRecord(validDataDirectory, "test-project.json", {
    ...publishedFixture,
    overview: { ...publishedFixture.overview, heading: "Edited CMS heading" }
  });
  await writeFile(join(outputDirectory, "previous-build-only.txt"), "stale");
  const rebuild = await buildSite({
    sourceRoot: sourceFixture,
    dataDirectory: validDataDirectory,
    outputDirectory
  });
  assert.equal(rebuild.generatedPageCount, 8);
  await assert.rejects(readFile(join(outputDirectory, "previous-build-only.txt")));
  const updatedOverview = await readFile(join(outputDirectory, "case-studies/test-project/index.html"), "utf8");
  assert.match(updatedOverview, /Edited CMS heading/);
});

test("fails invalid media validation without changing the prior build output", async () => {
  const outputDirectory = join(sourceFixture, "dist");
  const before = await readFile(join(outputDirectory, "ouro/index.html"), "utf8");
  const invalidDirectory = join(testRoot, "invalid-data");
  await writeRecord(invalidDirectory, "broken.json", {
    ...publishedFixture,
    overview: { ...publishedFixture.overview, heroMediaUrl: "" }
  });
  await assert.rejects(
    buildSite({ sourceRoot: sourceFixture, dataDirectory: invalidDirectory, outputDirectory }),
    /overview\.heroMediaUrl/
  );
  assert.equal(await readFile(join(outputDirectory, "ouro/index.html"), "utf8"), before);
});

test("fails when required media fields are missing", async () => {
  const invalidDirectory = join(testRoot, "missing-media-data");
  const record = structuredClone(publishedFixture);
  delete record.overview.heroMediaUrl;
  await writeRecord(invalidDirectory, "missing-media.json", record);
  await assert.rejects(
    buildSite({
      sourceRoot: sourceFixture,
      dataDirectory: invalidDirectory,
      outputDirectory: join(sourceFixture, "dist")
    }),
    /overview\.heroMediaUrl/
  );
});

test("a static-copy failure leaves the prior output intact and removes the stage", async () => {
  const brokenSource = join(testRoot, "broken-source");
  const outputDirectory = join(brokenSource, "dist");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "sentinel.txt"), "previous build");
  await assert.rejects(
    buildSite({ sourceRoot: brokenSource, dataDirectory: validDataDirectory, outputDirectory }),
    /ENOENT/
  );
  assert.equal(await readFile(join(outputDirectory, "sentinel.txt"), "utf8"), "previous build");
  assert.deepEqual(
    (await readdir(brokenSource)).filter((name) => name.startsWith(".site-build-stage-")),
    []
  );
});

test("rejects unsafe output paths before copying any site files", async () => {
  const outputDirectory = join(sourceFixture, "dist");
  await assert.rejects(
    buildSite({ sourceRoot: sourceFixture, dataDirectory: validDataDirectory, outputDirectory: sourceFixture }),
    /repository dist directory/
  );
  await assert.rejects(
    buildSite({ sourceRoot: sourceFixture, dataDirectory: validDataDirectory, outputDirectory: testRoot }),
    /cannot contain the source repository/
  );
  const existingExternalOutput = join(testRoot, "existing-output");
  await mkdir(existingExternalOutput, { recursive: true });
  await assert.rejects(
    buildSite({ sourceRoot: repositoryRoot, dataDirectory: validDataDirectory, outputDirectory: existingExternalOutput }),
    /must not already exist/
  );
});

test("static copy strategy is explicit and leaves CMS and deployment source behind", async () => {
  const destination = join(testRoot, "copy-check");
  await mkdir(destination);
  await copyStaticSite(sourceFixture, destination);
  await assert.rejects(readFile(join(destination, "data/case-studies/ouro.json")));
  await assert.rejects(readFile(join(destination, "netlify.toml")));
  await assert.rejects(readFile(join(destination, "middleware.js")));
});

test("package scripts do not change the existing CommonJS API runtime mode", async () => {
  const packageJson = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(packageJson.type, undefined);
});

test("builds from real sources without modifying original OURO production files", async () => {
  const sourceFiles = [
    "ouro/index.html",
    "ouro/brand-identity/index.html",
    "ouro/launch/index.html",
    "ouro/event-brand-identity/index.html",
    "ouro/investor-communications/index.html",
    "ouro/assets/ouro.css",
    "ouro/assets/ouro.js"
  ];
  const originals = await Promise.all(sourceFiles.map((file) => readFile(join(repositoryRoot, file))));
  const outputDirectory = join(testRoot, "source-isolation-output");
  await buildSite({
    sourceRoot: repositoryRoot,
    dataDirectory: validDataDirectory,
    outputDirectory
  });
  for (const [index, file] of sourceFiles.entries()) {
    assert.deepEqual(await readFile(join(repositoryRoot, file)), originals[index], `${file} changed`);
  }
  const generatedOuro = await readFile(join(outputDirectory, "ouro/index.html"), "utf8");
  assert.match(generatedOuro, /OURO/);
  assert.match(generatedOuro, /Test project overview/);
});
