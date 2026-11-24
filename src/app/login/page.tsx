// The /login page. Logged-out visitors of /modules, /plan and /progress are
// sent here by src/proxy.ts, with ?next= telling us where to go back to.

import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { safeNext } from "@/lib/safeNext";

export const metadata: Metadata = {
  title: "Log in · StudySprint",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const initialError =
    params.error === "confirm" ? "That confirmation link didn't work or has expired. Try signing in, or create the account again." : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <LoginForm next={next} initialError={initialError} />
    </main>
  );
}
