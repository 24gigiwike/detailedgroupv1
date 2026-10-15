// Temporary site-wide maintenance gate.
// This is a discreet preview switch, not authentication. Anyone who opens
// /developers-txt receives the preview cookie. Do not describe it as secure.
//
// Disable later: set MAINTENANCE to false and redeploy.
// The original pages are not modified; this only decides what the host returns.

const MAINTENANCE = true;

const SCREEN = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Detailed Group is refining its digital experience.">
<title>Detailed Group</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    min-height: 100dvh;
    background: #000;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .screen {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: clamp(28px, 5vh, 64px) clamp(24px, 6vw, 80px) clamp(20px, 3vh, 36px);
  }
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: min(920px, 100%);
    padding-bottom: 8vh;
  }
  .label {
    margin: 0 0 32px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.24em;
    color: #8e8e93;
  }
  h1 {
    margin: 0;
    max-width: 11ch;
    font-weight: 500;
    font-size: clamp(44px, 6.6vw, 92px);
    line-height: 1.02;
    letter-spacing: -0.048em;
  }
  .support {
    margin: 36px 0 0;
    max-width: 28rem;
    font-size: clamp(16px, 1.4vw, 20px);
    font-weight: 300;
    line-height: 1.6;
    letter-spacing: -0.011em;
    color: #a1a1a1;
  }
  footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 24px;
    width: min(920px, 100%);
    font-size: 11px;
    letter-spacing: 0.16em;
    color: #5c5c5e;
  }
  footer a {
    color: #6e6e72;
    text-decoration: none;
    letter-spacing: 0.01em;
    font-size: 12px;
  }
  footer a:hover { color: #a1a1a1; }
  footer a:focus-visible { outline: 1px solid #8e8e93; outline-offset: 4px; }
  .enter { animation: rise 1.05s cubic-bezier(0.22, 1, 0.36, 1) both; }
  footer.enter { animation-delay: 0.12s; }
  @keyframes rise {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .enter { animation: none; }
  }
  @media (max-width: 640px) {
    h1 { max-width: 12ch; }
    footer { letter-spacing: 0.08em; align-items: flex-end; }
  }
</style>
</head>
<body>
  <div class="screen">
    <main class="enter">
      <p class="label">DETAILED GROUP</p>
      <h1>Something exceptional is taking shape.</h1>
      <p class="support">We're currently refining our digital experience. Please check back soon.</p>
    </main>
    <footer class="enter">
      <span>© DETAILED GROUP</span>
      <a href="/developers-txt">developer's txt</a>
    </footer>
  </div>
</body>
</html>`;

function hasPreview(request) {
  const cookie = request.headers.get("cookie") || "";
  return /(?:^|;\s*)dg_preview=1(?:\s*;|$)/.test(cookie);
}

function previewCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return "dg_preview=1; Path=/; Max-Age=1209600; SameSite=Lax; HttpOnly" + secure;
}

export function gate(request) {
  if (!MAINTENANCE) return null;

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (path === "/developers-txt") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": previewCookie(request),
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (hasPreview(request)) return null;

  return new Response(SCREEN, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Cookie",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export default async function handler(request, context) {
  if (!MAINTENANCE) return context.next();
  const blocked = gate(request);
  if (blocked) return blocked;
  const origin = await context.next();
  const headers = new Headers(origin.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Cookie");
  return new Response(origin.body, { status: origin.status, statusText: origin.statusText, headers });
}

export const config = { path: "/*" };
