// After logging in we send you back to the page you wanted ("?next=/plan").
// Only paths on this site are allowed, so a crafted link can't send you to
// another website ("//evil.com" or "https://evil.com").

export function safeNext(next: string | null | undefined, fallback = "/modules"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
