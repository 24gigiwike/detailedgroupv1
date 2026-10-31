export const legacyRouteMappings = Object.freeze({
  ouro: Object.freeze({
    overview: "/ouro/",
    chapters: Object.freeze({
      brandIdentity: "/ouro/brand-identity/",
      launch: "/ouro/launch/",
      eventBrandIdentity: "/ouro/event-brand-identity/",
      investorCommunications: "/ouro/investor-communications/"
    })
  })
});

const routePattern = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/;

export function getLegacyRouteMapping(slug) {
  return Object.hasOwn(legacyRouteMappings, slug) ? legacyRouteMappings[slug] : undefined;
}

export function validateLegacyRouteMappings(records) {
  const paths = new Set();
  for (const [slug, mapping] of Object.entries(legacyRouteMappings)) {
    const mappedPaths = [mapping.overview, ...Object.values(mapping.chapters)];
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        mappedPaths.some((path) => !routePattern.test(path))) {
      throw new Error(`Invalid legacy route mapping for "${slug}".`);
    }
    if (new Set(mappedPaths).size !== mappedPaths.length) {
      throw new Error(`Legacy route mapping for "${slug}" contains duplicate paths.`);
    }
    for (const path of mappedPaths) {
      if (paths.has(path)) throw new Error(`Legacy route path is mapped more than once: ${path}`);
      paths.add(path);
    }
  }

  for (const { record, filename } of records) {
    const mapping = getLegacyRouteMapping(record?.slug);
    if (!mapping) continue;
    const missingFields = Object.keys(mapping.chapters)
      .filter((field) => record[field]?.enabled !== true);
    if (missingFields.length) {
      throw new Error(
        `${filename}: legacy OURO routes require all mapped chapters enabled (${missingFields.join(", ")}).`
      );
    }
  }
}
