// Security headers sent with every page (used by next.config.ts).
// They tell the browser to refuse things this app never needs, so that an
// attacker who sneaks something into a page still can't do much with it.

export interface Header {
  key: string;
  value: string;
}

interface Options {
  /** Your Supabase project URL: the only outside site the app talks to. */
  supabaseUrl: string | undefined;
  /** `next dev` needs eval for its error overlay; production never does. */
  isDev: boolean;
}

/** The Content Security Policy: where scripts, styles, images and data may come from. */
export function contentSecurityPolicy({ supabaseUrl, isDev }: Options): string {
  // Only the site's own origin (scheme + host), never a path.
  const supabase = supabaseUrl ? new URL(supabaseUrl).origin : "";

  const rules = [
    "default-src 'self'",
    // Next.js puts small inline scripts in each page, so 'unsafe-inline' is
    // needed unless every page is rendered per request with a nonce.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // Data only goes to this site and your Supabase (login + database).
    `connect-src 'self'${supabase ? ` ${supabase}` : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // No other site may show this app inside a frame (clickjacking).
    "frame-ancestors 'none'",
  ];
  return rules.join("; ");
}

export function securityHeaders(options: Options): Header[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // The older way to block framing, for browsers that ignore frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    // Don't guess file types (stops a disguised file being run as a script).
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Other sites see only "studysprint.example", not the full page address.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // The app never needs these, so no page can ever ask for them.
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
    // A page on another site that opened this one in a new tab can't reach into it.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
