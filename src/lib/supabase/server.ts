// Supabase helper for code that runs on the Next.js server
// (server components, server actions, route handlers).
// Create a new one per request; never share it between users.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components can't set cookies. That's fine: src/proxy.ts
          // refreshes the session before every page anyway.
        }
      },
    },
  });
}
