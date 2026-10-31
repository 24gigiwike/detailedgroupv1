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
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`)
    .join("\n");
}

export function renderMedia({ type, url, mobileUrl = "", poster = "", alt = "" }) {
  const safeUrl = escapeHtml(url);
  const safeMobileUrl = mobileUrl ? escapeHtml(mobileUrl) : "";
  const safePoster = poster ? escapeHtml(poster) : "";
  const safeAlt = escapeHtml(alt);
  if (type === "video") {
    const sourceType = (sourceUrl) => /\.webm(?:\?.*)?$/i.test(sourceUrl) ? "video/webm" : "video/mp4";
    return `<video class="land-video" autoplay muted loop playsinline preload="metadata"${safePoster ? ` poster="${safePoster}"` : ""}>${safeMobileUrl ? `<source media="(max-width: 767px)" src="${safeMobileUrl}" type="${sourceType(mobileUrl)}">` : ""}<source src="${safeUrl}" type="${sourceType(url)}"></video>`;
  }
  return `<picture>${safeMobileUrl ? `<source media="(max-width: 767px)" srcset="${safeMobileUrl}">` : ""}<img class="land-video" src="${safeUrl}"${safeAlt ? ` alt="${safeAlt}"` : ' alt=""'}></picture>`;
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
<link rel="stylesheet" href="/ouro/assets/ouro.css">
<script defer src="/ouro/assets/ouro.js?v=35"></script>
</head>
<body class="is-landing">
${content}
</body>
</html>
`;
}
