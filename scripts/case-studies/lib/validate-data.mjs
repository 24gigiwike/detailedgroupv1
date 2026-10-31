const chapterDefinitions = [
  ["brandIdentity", "brand-identity"],
  ["launch", "launch"],
  ["eventBrandIdentity", "event-brand-identity"],
  ["investorCommunications", "investor-communications"]
];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isMediaUrl(value) {
  if (!isNonEmptyString(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//") &&
      !value.includes("\\") && !/[\u0000-\u001f\s]/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function addError(errors, record, field, message) {
  errors.push(`${record.filename}: ${field} ${message}`);
}

function validateHero(hero, record, field, errors, mediaTypeField, urlField) {
  if (!hero || typeof hero !== "object" || Array.isArray(hero)) {
    addError(errors, record, field, "must be an object");
    return;
  }
  if (!["image", "video"].includes(hero[mediaTypeField])) {
    addError(errors, record, `${field}.${mediaTypeField}`, "must be image or video");
  }
  if (!isMediaUrl(hero[urlField])) {
    addError(errors, record, `${field}.${urlField}`, "must be an HTTP(S) or root-relative URL");
  }
  if (hero.mobileHeroMediaUrl && !isMediaUrl(hero.mobileHeroMediaUrl)) {
    addError(errors, record, `${field}.mobileHeroMediaUrl`, "must be an HTTP(S) or root-relative URL");
  }
  if (hero.heroPosterImage && !isMediaUrl(hero.heroPosterImage)) {
    addError(errors, record, `${field}.heroPosterImage`, "must be an HTTP(S) or root-relative image URL");
  }
  if (hero.heroLogoImage && !isMediaUrl(hero.heroLogoImage)) {
    addError(errors, record, `${field}.heroLogoImage`, "must be an HTTP(S) or root-relative image URL");
  }
}

function validateGallery(gallery, record, field, errors) {
  if (gallery === undefined) return;
  if (!Array.isArray(gallery)) {
    addError(errors, record, field, "must be a list");
    return;
  }
  gallery.forEach((item, index) => {
    const itemField = `${field}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      addError(errors, record, itemField, "must be an object");
      return;
    }
    if (!["image", "video"].includes(item.mediaType)) {
      addError(errors, record, `${itemField}.mediaType`, "must be image or video");
    }
    if (!isMediaUrl(item.mediaUrl)) {
      addError(errors, record, `${itemField}.mediaUrl`, "must be an HTTP(S) or root-relative URL");
    }
    if (item.alt !== undefined && typeof item.alt !== "string") {
      addError(errors, record, `${itemField}.alt`, "must be text");
    }
    if (item.caption !== undefined && typeof item.caption !== "string") {
      addError(errors, record, `${itemField}.caption`, "must be text");
    }
    if ((item.width !== undefined || item.height !== undefined) &&
        (!Number.isInteger(item.width) || item.width <= 0 ||
         !Number.isInteger(item.height) || item.height <= 0)) {
      addError(errors, record, itemField, "width and height must be positive integers when provided");
    }
  });
}

function validateSlides(slides, record, field, errors, kind) {
  if (slides === undefined) return;
  if (!Array.isArray(slides)) {
    addError(errors, record, field, "must be a list");
    return;
  }
  slides.forEach((slide, index) => {
    const slideField = `${field}[${index}]`;
    if (!slide || typeof slide !== "object" || Array.isArray(slide)) {
      addError(errors, record, slideField, "must be an object");
      return;
    }
    if (kind === "keynote") {
      if (!isNonEmptyString(slide.title)) addError(errors, record, `${slideField}.title`, "is required");
      if (!["image", "video"].includes(slide.mediaType)) {
        addError(errors, record, `${slideField}.mediaType`, "must be image or video");
      }
      if (!isMediaUrl(slide.mediaUrl)) {
        addError(errors, record, `${slideField}.mediaUrl`, "must be an HTTP(S) or root-relative URL");
      }
      for (const name of ["speaker", "directionNotes", "motionLabel", "contextLabel", "script", "scriptNote"]) {
        if (slide[name] !== undefined && typeof slide[name] !== "string") {
          addError(errors, record, `${slideField}.${name}`, "must be text");
        }
      }
    } else {
      if (!isMediaUrl(slide.imageUrl)) {
        addError(errors, record, `${slideField}.imageUrl`, "must be an HTTP(S) or root-relative URL");
      }
      for (const name of ["alt", "title"]) {
        if (slide[name] !== undefined && typeof slide[name] !== "string") {
          addError(errors, record, `${slideField}.${name}`, "must be text");
        }
      }
    }
  });
}

export function validateCaseStudies(entries) {
  const errors = [];
  const slugs = new Set();

  for (const entry of entries) {
    const { record } = entry;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      addError(errors, entry, "record", "must be a JSON object");
      continue;
    }
    for (const name of ["title", "shortDescription", "category"]) {
      if (!isNonEmptyString(record[name])) addError(errors, entry, name, "is required");
    }
    if (!isNonEmptyString(record.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) {
      addError(errors, entry, "slug", "must use lowercase letters, numbers, and single hyphens");
    } else if (record.slug === "index") {
      addError(errors, entry, "slug", "is reserved");
    } else if (slugs.has(record.slug)) {
      addError(errors, entry, "slug", "must be unique");
    } else {
      slugs.add(record.slug);
    }
    if (!["draft", "published"].includes(record.status)) {
      addError(errors, entry, "status", "must be draft or published");
    }
    if (!Number.isInteger(record.displayOrder)) {
      addError(errors, entry, "displayOrder", "must be an integer");
    }
    if (!isMediaUrl(record.coverImage)) {
      addError(errors, entry, "coverImage", "must be an HTTP(S) or root-relative image URL");
    }

    const overview = record.overview;
    if (!overview || typeof overview !== "object" || Array.isArray(overview)) {
      addError(errors, entry, "overview", "must be an object");
    } else {
      for (const name of ["heading", "intro", "body"]) {
        if (!isNonEmptyString(overview[name])) addError(errors, entry, `overview.${name}`, "is required");
      }
      for (const name of ["heroHeading", "heroIntro", "heroNote", "editorialHeading", "editorialIntro"]) {
        if (overview[name] !== undefined && typeof overview[name] !== "string") {
          addError(errors, entry, `overview.${name}`, "must be text");
        }
      }
      validateHero(overview, entry, "overview", errors, "heroMediaType", "heroMediaUrl");
    }

    for (const [field] of chapterDefinitions) {
      const chapter = record[field];
      if (chapter === undefined || chapter === null) continue;
      if (typeof chapter !== "object" || Array.isArray(chapter)) {
        addError(errors, entry, field, "must be an object");
        continue;
      }
      if (chapter.enabled !== undefined && typeof chapter.enabled !== "boolean") {
        addError(errors, entry, `${field}.enabled`, "must be true or false");
      }
      if (chapter.enabled !== true) continue;
      for (const name of ["heading", "intro", "body"]) {
        if (!isNonEmptyString(chapter[name])) addError(errors, entry, `${field}.${name}`, "is required when enabled");
      }
      for (const name of ["heroHeading", "heroIntro", "heroNote", "editorialHeading", "editorialIntro"]) {
        if (chapter[name] !== undefined && typeof chapter[name] !== "string") {
          addError(errors, entry, `${field}.${name}`, "must be text");
        }
      }
      validateHero(
        chapter,
        entry,
        field,
        errors,
        "heroMediaType",
        "desktopHeroMediaUrl"
      );
      validateGallery(chapter.gallery, entry, `${field}.gallery`, errors);
    }

    validateSlides(record.keynoteSlides, entry, "keynoteSlides", errors, "keynote");
    validateSlides(record.investorDeckSlides, entry, "investorDeckSlides", errors, "investor");
    for (const name of ["keynoteHeading", "keynoteKicker", "keynoteIntro", "investorDeckHeading"]) {
      if (record[name] !== undefined && typeof record[name] !== "string") {
        addError(errors, entry, name, "must be text");
      }
    }
  }
  return errors;
}
