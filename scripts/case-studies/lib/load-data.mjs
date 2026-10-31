import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function loadCaseStudies(dataDirectory) {
  const entries = await readdir(dataDirectory, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const records = [];
  for (const filename of filenames) {
    const filePath = join(dataDirectory, filename);
    let record;
    try {
      const source = (await readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
      record = JSON.parse(source);
    } catch (error) {
      throw new Error(`Unable to read valid JSON from ${filePath}: ${error.message}`);
    }
    records.push({ filename, filePath, record });
  }
  return records;
}
