import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceMiddleware = join(repositoryRoot, "middleware.js");
const sourceGate = join(repositoryRoot, "netlify", "edge-functions", "maintenance.js");

async function loadMiddlewareFixture(enableMaintenance) {
  const directory = join(repositoryRoot, `.middleware-test-${process.pid}-${Date.now()}`);
  const gateDirectory = join(directory, "netlify", "edge-functions");
  await mkdir(gateDirectory, { recursive: true });
  let gateSource = await readFile(sourceGate, "utf8");
  if (enableMaintenance) {
    gateSource = gateSource.replace("const MAINTENANCE = false;", "const MAINTENANCE = true;");
  }
  await writeFile(join(directory, "package.json"), '{"type":"module"}');
  await copyFile(sourceMiddleware, join(directory, "middleware.js"));
  await writeFile(join(gateDirectory, "maintenance.js"), gateSource);
  const middleware = await import(`${pathToFileURL(join(directory, "middleware.js")).href}?test=${Date.now()}`);
  return { directory, ...middleware };
}

test("Vercel Routing Middleware passes normal site and API routes through", async () => {
  const fixture = await loadMiddlewareFixture(false);
  try {
    const vercelConfig = JSON.parse(await readFile(join(repositoryRoot, "vercel.json"), "utf8"));
    assert.equal(vercelConfig.proxy.entrypoint, "middleware.js");
    assert.equal(vercelConfig.buildCommand, "npm run build");
    assert.equal(vercelConfig.outputDirectory, "dist");
    assert.equal(vercelConfig.trailingSlash, true);
    assert.equal(vercelConfig.rewrites, undefined);
    assert.deepEqual(vercelConfig.redirects.map(({ source, destination, permanent }) => ({
      source,
      destination,
      permanent
    })), [
      { source: "/ouro/story", destination: "/ouro/", permanent: true },
      { source: "/ouro/story/", destination: "/ouro/", permanent: true },
      { source: "/ouro/vision", destination: "/ouro/", permanent: true },
      { source: "/ouro/vision/", destination: "/ouro/", permanent: true },
      { source: "/ouro/identity", destination: "/ouro/brand-identity/", permanent: true },
      { source: "/ouro/identity/", destination: "/ouro/brand-identity/", permanent: true },
      { source: "/ouro/creative-direction", destination: "/ouro/", permanent: true },
      { source: "/ouro/creative-direction/", destination: "/ouro/", permanent: true }
    ]);
    assert.equal(fixture.config.matcher, "/(.*)");
    for (const path of ["/", "/ouro/", "/case-studies/example/", "/api/contact"]) {
      const response = fixture.default(new Request(`https://example.test${path}`));
      assert.equal(response.status, 200);
      assert.ok(response.headers.has("x-middleware-next"));
    }
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("enabled maintenance gate blocks requests and permits its preview-cookie flow", async () => {
  const fixture = await loadMiddlewareFixture(true);
  try {
    const blocked = fixture.default(new Request("https://example.test/ouro/"));
    assert.equal(blocked.status, 200);
    assert.match(await blocked.text(), /Something exceptional is taking shape/);
    assert.equal(blocked.headers.get("x-robots-tag"), "noindex, nofollow");

    const preview = fixture.default(new Request("https://example.test/developers-txt"));
    assert.equal(preview.status, 302);
    assert.equal(preview.headers.get("location"), "/");
    const cookie = preview.headers.get("set-cookie");
    assert.match(cookie, /dg_preview=1/);

    const allowed = fixture.default(new Request("https://example.test/api/contact", {
      headers: { cookie: "dg_preview=1" }
    }));
    assert.equal(allowed.status, 200);
    assert.ok(allowed.headers.has("x-middleware-next"));

    const robots = fixture.default(new Request("https://example.test/robots.txt"));
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Disallow: \//);
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});
