// Vercel edge middleware. Uses the same gate as the Netlify function.
// A plain static server does not run this file. It is not an access-control system.
import { gate } from "./netlify/edge-functions/maintenance.js";

export default function middleware(request) {
  const blocked = gate(request);
  if (blocked) return blocked;
  return new Response(null, {
    headers: { "x-middleware-next": "1" },
  });
}

export const config = {
  matcher: "/(.*)",
};
