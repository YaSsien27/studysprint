// crypto.randomUUID only exists on https:// or localhost, so opening the dev
// server from a phone (http://192.168.x.x:3000) would crash without the fallback.
export function newId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
