import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./securityHeaders";

const SUPABASE = "https://abcdefgh.supabase.co";
const rule = (csp: string, name: string) => csp.split("; ").find((r) => r.startsWith(`${name} `));

describe("contentSecurityPolicy", () => {
  it("lets the app talk only to itself and Supabase", () => {
    const csp = contentSecurityPolicy({ supabaseUrl: SUPABASE, isDev: false });
    expect(rule(csp, "connect-src")).toBe(`connect-src 'self' ${SUPABASE}`);
    expect(rule(csp, "default-src")).toBe("default-src 'self'");
  });

  it("uses only the origin of the Supabase URL", () => {
    const csp = contentSecurityPolicy({ supabaseUrl: `${SUPABASE}/rest/v1/`, isDev: false });
    expect(rule(csp, "connect-src")).toBe(`connect-src 'self' ${SUPABASE}`);
  });

  it("blocks framing, plugins and foreign forms", () => {
    const csp = contentSecurityPolicy({ supabaseUrl: SUPABASE, isDev: false });
    expect(rule(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(rule(csp, "object-src")).toBe("object-src 'none'");
    expect(rule(csp, "form-action")).toBe("form-action 'self'");
    expect(rule(csp, "base-uri")).toBe("base-uri 'self'");
  });

  it("allows eval only in development", () => {
    expect(rule(contentSecurityPolicy({ supabaseUrl: SUPABASE, isDev: true }), "script-src")).toContain("'unsafe-eval'");
    expect(rule(contentSecurityPolicy({ supabaseUrl: SUPABASE, isDev: false }), "script-src")).not.toContain("'unsafe-eval'");
  });

  it("still works without a Supabase URL", () => {
    expect(rule(contentSecurityPolicy({ supabaseUrl: undefined, isDev: false }), "connect-src")).toBe("connect-src 'self'");
  });
});

describe("securityHeaders", () => {
  it("includes every protective header", () => {
    const keys = securityHeaders({ supabaseUrl: SUPABASE, isDev: false }).map((h) => h.key);
    expect(keys).toEqual([
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
    ]);
  });
});
