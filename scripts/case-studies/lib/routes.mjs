const chapters = [
  ["brandIdentity", "brand-identity", "Brand Identity"],
  ["launch", "launch", "Launch Communications"],
  ["eventBrandIdentity", "event-brand-identity", "Event Brand Identity"],
  ["investorCommunications", "investor-communications", "Investor Communications"]
];

export function generateRoutes(records) {
  const routes = [];
  for (const record of records) {
    if (record.status !== "published") continue;
    const basePath = `/case-studies/${record.slug}/`;
    const enabledChapters = chapters
      .filter(([field]) => record[field]?.enabled === true)
      .map(([field, slug, label]) => ({
        field,
        slug,
        label,
        path: `${basePath}${slug}/`,
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
  return routes;
}
