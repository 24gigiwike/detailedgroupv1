import { getLegacyRouteMapping, validateLegacyRouteMappings } from "./legacy-route-mapping.mjs";

const chapters = [
  ["brandIdentity", "brand-identity", "Brand Identity"],
  ["launch", "launch", "Launch Communications"],
  ["eventBrandIdentity", "event-brand-identity", "Event Brand Identity"],
  ["investorCommunications", "investor-communications", "Investor Communications"]
];

export function generateRoutes(records) {
  validateLegacyRouteMappings(records.map((record) => ({ record, filename: `${record.slug}.json` })));
  const routes = [];
  for (const record of records) {
    if (record.status !== "published") continue;
    const legacyMapping = getLegacyRouteMapping(record.slug);
    const basePath = legacyMapping?.overview || `/case-studies/${record.slug}/`;
    const enabledChapters = chapters
      .filter(([field]) => record[field]?.enabled === true)
      .map(([field, chapterSlug, label]) => ({
        field,
        slug: chapterSlug,
        label,
        path: legacyMapping?.chapters[field] || `${basePath}${chapterSlug}/`,
        content: record[field]
      }));
    routes.push({
      type: "overview",
      path: basePath,
      record,
      chapters: enabledChapters
    });
    enabledChapters.forEach((chapter, index) => {
      routes.push({
        type: "chapter",
        path: chapter.path,
        record,
        chapter,
        chapters: enabledChapters,
        previous: index === 0 ? null : enabledChapters[index - 1],
        next: index === enabledChapters.length - 1 ? null : enabledChapters[index + 1]
      });
    });
  }
  const paths = routes.map((route) => route.path);
  if (new Set(paths).size !== paths.length) {
    throw new Error("Generated case study routes contain duplicate paths.");
  }
  return routes;
}
