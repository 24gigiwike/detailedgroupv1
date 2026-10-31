export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderText(value = "") {
  return String(value)
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\r?\n/g, "<br>")}</p>`)
    .join("\n");
}

function mediaTypeFor(url) {
  if (/\.webm(?:[?#].*)?$/i.test(url)) return "video/webm";
  if (/\.mov(?:[?#].*)?$/i.test(url)) return "video/quicktime";
  return "video/mp4";
}

export function renderMedia({
  type,
  url,
  mobileUrl = "",
  poster = "",
  alt = "",
  className = "land-video",
  preload = "metadata",
  autoplay = true,
  loop = true
}) {
  const safeUrl = escapeHtml(url);
  const safeMobileUrl = mobileUrl ? escapeHtml(mobileUrl) : "";
  const safePoster = poster ? escapeHtml(poster) : "";
  const safeAlt = escapeHtml(alt);
  if (type === "video") {
    return `<video class="${escapeHtml(className)}" data-responsive-media data-desktop-src="${safeUrl}"${safeMobileUrl ? ` data-mobile-src="${safeMobileUrl}"` : ""}${autoplay ? " autoplay" : ""} muted${loop ? " loop" : ""} playsinline preload="${escapeHtml(preload)}"${safePoster ? ` poster="${safePoster}"` : ""}><source src="${safeUrl}" type="${mediaTypeFor(url)}"></video>`;
  }
  return `<picture>${safeMobileUrl ? `<source media="(max-width: 767px)" srcset="${safeMobileUrl}">` : ""}<img class="${escapeHtml(className)}" src="${safeUrl}"${safeAlt ? ` alt="${safeAlt}"` : ' alt=""'}${safePoster ? ` data-poster="${safePoster}"` : ""}></picture>`;
}

export function renderDocument(title, content) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — Detailed Group</title>
<link rel="icon" href="/favicon_io/favicon-32x32.png">
<link rel="preconnect" href="https://res.cloudinary.com">
<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>
<link rel="stylesheet" href="/assets/lenis/lenis.css">
<link rel="stylesheet" href="/ouro/assets/ouro.css">
<script defer src="/assets/lenis/lenis.min.js"></script>
<script defer src="/assets/smooth-scroll.js"></script>
<script defer src="/scripts/case-studies/assets/interactions.js"></script>
</head>
<body class="is-landing">
${content}
</body>
</html>
`;
}
