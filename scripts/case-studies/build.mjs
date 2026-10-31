import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCaseStudies } from "./lib/load-data.mjs";
import { generateRoutes } from "./lib/routes.mjs";
import { validateCaseStudies } from "./lib/validate-data.mjs";
import { renderCaseStudiesDirectory } from "./templates/case-studies-directory.mjs";
import { renderCaseStudyPage } from "./templates/case-study-page.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const dataDirectory = resolve(repositoryRoot, "data/case-studies");

function parseArguments(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === "--check")) {
    return { mode: "check" };
  }
  if (args[0] === "--build" && args.length === 3 && args[1] === "--out") {
    return { mode: "build", outputDirectory: args[2] };
  }
  throw new Error("Usage: node scripts/case-studies/build.mjs [--check | --build --out <new-directory>]");
}

function outputPathForRoute(outputDirectory, routePath) {
  const relativePath = routePath.replace(/^\/+/, "");
  const outputPath = resolve(outputDirectory, relativePath, "index.html");
  const outputPrefix = `${resolve(outputDirectory)}${sep}`;
  if (!outputPath.startsWith(outputPrefix)) {
    throw new Error(`Generated route escapes output directory: ${routePath}`);
  }
  return outputPath;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const entries = await loadCaseStudies(dataDirectory);
  const validationErrors = validateCaseStudies(entries);
  if (validationErrors.length) {
    throw new Error(`Case study validation failed:\n${validationErrors.map((error) => `- ${error}`).join("\n")}`);
  }

  const records = entries.map(({ record }) => record);
  const routes = generateRoutes(records);
  if (options.mode === "check") {
    console.log(`Validated ${records.length} case study record(s); ${routes.length + 1} route(s) planned.`);
    console.log("No files were generated. Use --build --out <new-directory> to create a separate static output tree.");
    return;
  }

  const outputDirectory = resolve(
    isAbsolute(options.outputDirectory) ? options.outputDirectory : resolve(repositoryRoot, options.outputDirectory)
  );
  const normalizedOutputDirectory = outputDirectory.toLowerCase();
  const normalizedRepositoryRoot = repositoryRoot.toLowerCase();
  if (normalizedOutputDirectory === normalizedRepositoryRoot ||
      normalizedOutputDirectory.startsWith(`${normalizedRepositoryRoot}${sep}`)) {
    throw new Error("Output directory must be outside the repository so the site tree remains untouched.");
  }
  const files = [
    {
      route: "/case-studies/",
      content: renderCaseStudiesDirectory(records)
    },
    ...routes.map((route) => ({
      route: route.path,
      content: renderCaseStudyPage(route)
    }))
  ].map((file) => ({
    path: outputPathForRoute(outputDirectory, file.route),
    content: file.content
  }));

  await mkdir(outputDirectory, { recursive: false });
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, { flag: "wx" });
  }
  console.log(`Generated ${files.length} page(s) in ${outputDirectory}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
