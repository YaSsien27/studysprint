"use client";

// Small helpers for the logged-in user, used by the nav bar and login form.

import { useEffect, useState } from "react";
import { resetStore } from "@/lib/db/store";
import { createClient } from "@/lib/supabase/client";

export interface CurrentUser {
  email: string | null;
  /** Your name, given at sign-up. Older accounts may not have one. */
  name: string | null;
}

// The name lives in Supabase's "user metadata", stored with the account.
// It is only for showing in the header: people can change their own metadata,
// so it must never be used to decide what someone is allowed to see.
type AuthUser = { email?: string; user_metadata?: { name?: unknown } };

export function toCurrentUser(u: AuthUser | null | undefined): CurrentUser | null {
  if (!u) return null;
  const name = u.user_metadata?.name;
  return { email: u.email ?? null, name: typeof name === "string" && name !== "" ? name : null };
}

/** The logged-in user; null when logged out; undefined while still checking. */
export function useCurrentUser(): CurrentUser | null | undefined {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(toCurrentUser(data.user)));
    // Updates the nav straight away when you log in or out (also in other tabs).
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(toCurrentUser(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  return user;
}

export async function signIn(email: string, password: string) {
  resetStore();
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

/** Saves a new name for the logged-in user. The header updates by itself
 * (Supabase tells useCurrentUser that the user changed). */
export async function updateName(name: string) {
  const { error } = await createClient().auth.updateUser({ data: { name } });
  return { error: error?.message ?? null };
}

/** Creates an account. needsConfirmation: Supabase sent an email to click first. */
export async function signUp(email: string, password: string, name: string, next: string) {
  resetStore();
  const { data, error } = await createClient().auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
}

export async function signOut() {
  await createClient().auth.signOut();
  resetStore(); // the next person on this device starts with nothing in memory
}
