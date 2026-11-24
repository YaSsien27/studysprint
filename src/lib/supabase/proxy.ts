// Runs before every page (called from src/proxy.ts). It does two jobs:
// 1. Refreshes the login session, so it doesn't quietly expire.
// 2. Sends logged-out visitors of private pages to /login.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safeNext";
import { supabaseEnv } from "./env";

/** Pages you must be logged in to see. */
const PROTECTED_PATHS = ["/modules", "/plan", "/progress"];

export function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Where a logged-in visitor of /login should go: the page in ?next= if it is
 * on this site (e.g. /plan), otherwise /modules.
 */
export function afterLoginUrl(loginUrl: URL): URL {
  return new URL(safeNext(loginUrl.searchParams.get("next")), loginUrl);
}

// A redirect is a new response, so copy over any login cookies just refreshed;
// otherwise the browser and server get out of step and you're logged out.
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Pass fresh cookies on to the page being rendered and back to the browser.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Stops shared caches from storing a response that carries someone's cookies.
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Don't put code between createServerClient and getClaims(): getClaims()
  // is what checks the session and refreshes it when needed.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user && isProtected(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return redirectKeepingCookies(login, response);
  }

  // Already logged in? Skip the login page and go where you were heading.
  if (user && request.nextUrl.pathname === "/login") {
    return redirectKeepingCookies(afterLoginUrl(request.nextUrl), response);
  }

  return response;
}
