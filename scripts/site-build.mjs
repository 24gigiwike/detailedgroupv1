import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCaseStudies } from "./case-studies/lib/load-data.mjs";
import { generateRoutes } from "./case-studies/lib/routes.mjs";
import { validateCaseStudies } from "./case-studies/lib/validate-data.mjs";
import { renderCaseStudiesDirectory } from "./case-studies/templates/case-studies-directory.mjs";
import { renderCaseStudyPage } from "./case-studies/templates/case-study-page.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const rootFiles = [
  "index.html",
  "insights.html",
  "privacy.html",
  "terms.html",
  "social-preview.jpg",
  "AURA-VISUALS.webm",
  "DETAILED ANIMATION.webm",
  "dgcube.webm",
  "detailed-clarity.jpeg",
  "exec.jpg",
  "exec-1600.jpg",
  "exec-1600.webp",
  "exec-960.jpg",
  "exec-960.webp"
];
const publicDirectories = ["assets", "favicon_io", "ouro"];
const publicFiles = [
  "data/marquee.json",
  "scripts/case-studies/assets/interactions.js"
];
const caseStudyRoutePattern = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/;

function isWithin(parent, target) {
  const pathFromParent = relative(parent, target);
  return pathFromParent === "" ||
    (pathFromParent !== ".." &&
      !pathFromParent.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromParent));
}

function samePath(left, right) {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

async function assertSafeOutputDirectory(outputDirectory, sourceRoot) {
  const normalizedOutput = resolve(outputDirectory);
  const normalizedRoot = resolve(sourceRoot);
  const repositoryDist = resolve(normalizedRoot, "dist");
  const isRepositoryDist = samePath(normalizedOutput, repositoryDist);
  if (isWithin(normalizedRoot, normalizedOutput) && !samePath(normalizedOutput, repositoryDist)) {
    throw new Error(`Output must be the repository dist directory or a new directory outside the repository: ${normalizedOutput}`);
  }
  if (isWithin(normalizedOutput, normalizedRoot)) {
    throw new Error(`Output directory cannot contain the source repository: ${normalizedOutput}`);
  }
  const canonicalRoot = await realpath(normalizedRoot);
  let existingAncestor = dirname(normalizedOutput);
  while (true) {
    try {
      const canonicalAncestor = await realpath(existingAncestor);
      const canonicalOutput = resolve(canonicalAncestor, relative(existingAncestor, normalizedOutput));
      if (!isRepositoryDist &&
          (isWithin(canonicalRoot, canonicalOutput) || isWithin(canonicalOutput, canonicalRoot))) {
        throw new Error(`Output path resolves into or above the source repository: ${normalizedOutput}`);
      }
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = dirname(existingAncestor);
      if (parent === existingAncestor) throw error;
      existingAncestor = parent;
    }
  }
  try {
    const outputStat = await lstat(normalizedOutput);
    if (outputStat.isSymbolicLink() || !outputStat.isDirectory()) {
      throw new Error(`Output path must be a regular directory, not a file or symbolic link: ${normalizedOutput}`);
    }
    if (!isRepositoryDist) {
      throw new Error(`External output directory must not already exist: ${normalizedOutput}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return normalizedOutput;
}

function outputPathForRoute(outputDirectory, routePath) {
  if (!caseStudyRoutePattern.test(routePath)) {
    throw new Error(`Generated route is not a safe root-relative path: ${routePath}`);
  }
  const outputPath = resolve(outputDirectory, routePath.replace(/^\/+/, ""), "index.html");
  if (!isWithin(outputDirectory, outputPath)) {
    throw new Error(`Generated route escapes output directory: ${routePath}`);
  }
  return outputPath;
}

async function copyDirectory(sourceDirectory, destinationDirectory, copiedFiles) {
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = resolve(sourceDirectory, entry.name);
    const destinationPath = resolve(destinationDirectory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Static input contains an unsupported symbolic link: ${sourcePath}`);
    }
    if (entry.isDirectory()) {
      await mkdir(destinationPath, { recursive: true });
      await copyDirectory(sourcePath, destinationPath, copiedFiles);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, destinationPath);
      copiedFiles.push(relative(destinationDirectory, destinationPath));
    }
  }
}

export async function copyStaticSite(sourceRoot, destinationDirectory) {
  const copiedFiles = [];
  for (const filename of rootFiles) {
    const sourcePath = resolve(sourceRoot, filename);
    await copyFile(sourcePath, resolve(destinationDirectory, filename));
    copiedFiles.push(filename);
  }
  for (const directory of publicDirectories) {
    const sourcePath = resolve(sourceRoot, directory);
    const destinationPath = resolve(destinationDirectory, directory);
    await mkdir(destinationPath, { recursive: true });
    await copyDirectory(sourcePath, destinationPath, copiedFiles);
  }
  for (const filename of publicFiles) {
    const sourcePath = resolve(sourceRoot, filename);
    const destinationPath = resolve(destinationDirectory, filename);
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
    copiedFiles.push(filename);
  }
  return copiedFiles;
}

async function promoteOutput(stagingDirectory, outputDirectory) {
  const backupDirectory = resolve(
    dirname(outputDirectory),
    `.${outputDirectory.split(/[\\/]/).pop()}.backup-${process.pid}-${Date.now()}`
  );
  let hasPreviousOutput = false;
  try {
    await lstat(outputDirectory);
    await rename(outputDirectory, backupDirectory);
    hasPreviousOutput = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  try {
    await rename(stagingDirectory, outputDirectory);
  } catch (promotionError) {
    if (hasPreviousOutput) {
      try {
        await rename(backupDirectory, outputDirectory);
      } catch (restoreError) {
        throw new Error(
          `Build promotion failed and the prior output could not be restored. ` +
          `Prior output remains at ${backupDirectory}. Promotion error: ${promotionError.message}. ` +
          `Restore error: ${restoreError.message}`
        );
      }
    }
    throw new Error(`Build promotion failed; previous output was preserved: ${promotionError.message}`);
  }

  if (hasPreviousOutput) {
    await rm(backupDirectory, { recursive: true });
  }
}

export async function buildSite({
  outputDirectory = resolve(repositoryRoot, "dist"),
  sourceRoot = repositoryRoot,
  dataDirectory = resolve(sourceRoot, "data/case-studies")
} = {}) {
  const safeOutputDirectory = await assertSafeOutputDirectory(outputDirectory, sourceRoot);
  const entries = await loadCaseStudies(dataDirectory);
  const validationErrors = validateCaseStudies(entries);
  if (validationErrors.length) {
    throw new Error(`Case study validation failed:\n${validationErrors.map((error) => `- ${error}`).join("\n")}`);
  }

  const records = entries.map(({ record }) => record);
  const routes = generateRoutes(records);
  const parentDirectory = dirname(safeOutputDirectory);
  await mkdir(parentDirectory, { recursive: true });
  const stagingDirectory = await mkdtemp(resolve(parentDirectory, ".site-build-stage-"));
  try {
    const copiedFiles = await copyStaticSite(sourceRoot, stagingDirectory);
    const generatedFiles = [
      {
        route: "/case-studies/",
        content: renderCaseStudiesDirectory(records)
      },
      ...routes.map((route) => ({
        route: route.path,
        content: renderCaseStudyPage(route)
      }))
    ];
    for (const file of generatedFiles) {
      const outputPath = outputPathForRoute(stagingDirectory, file.route);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, file.content, "utf8");
    }
    await promoteOutput(stagingDirectory, safeOutputDirectory);
    return {
      outputDirectory: safeOutputDirectory,
      copiedFileCount: copiedFiles.length,
      generatedPageCount: generatedFiles.length,
      generatedRoutes: generatedFiles.map((file) => file.route)
    };
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}

function parseArguments(args) {
  if (!args.length) return { outputDirectory: resolve(repositoryRoot, "dist") };
  if (args.length === 2 && args[0] === "--out") {
    return {
      outputDirectory: isAbsolute(args[1]) ? args[1] : resolve(repositoryRoot, args[1])
    };
  }
  throw new Error("Usage: node scripts/site-build.mjs [--out <directory>]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await buildSite(parseArguments(process.argv.slice(2)));
    console.log(
      `Built ${result.generatedPageCount} generated page(s) and copied ${result.copiedFileCount} static file(s) to ${result.outputDirectory}`
    );
    console.log(`Generated routes: ${result.generatedRoutes.join(", ")}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
