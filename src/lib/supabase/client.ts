// Supabase helper for code that runs in the browser (client components).
// The login session is kept in cookies, so the server can read it too.

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
