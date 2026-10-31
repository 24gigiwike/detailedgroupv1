// Vercel Routing Middleware. Uses the shared maintenance gate.
// A plain static server does not run this file. It is not an access-control system.
import { next } from "@vercel/functions";
import { gate } from "./netlify/edge-functions/maintenance.js";

export default function middleware(request) {
  const blocked = gate(request);
  if (blocked) return blocked;
  return next();
}

export const config = {
  matcher: "/(.*)",
};
