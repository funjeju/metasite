import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/subscribe",        // public newsletter subscribe page + API
  "/unsubscribe",      // public newsletter unsubscribe page + API
  "/api/subscribe",
  "/api/unsubscribe",
  "/api/webhook",      // external webhook trigger (own auth via x-webhook-secret)
  "/api/cron",         // Vercel cron jobs (own auth via x-cron-secret)
  "/api/health",       // health check (internal)
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("__session");
  if (!session?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
