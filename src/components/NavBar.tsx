"use client";

// The bar at the top of every page. A Client Component because it reads the
// current address (usePathname) to highlight the page you are on, and shows
// "Log in" or your name (or email, for older accounts) with "Log out".
// Clicking your name (or "Add your name") opens a pop-up to change it.
// The switch next to the links turns dark mode on or off.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { NameDialog } from "@/components/NameDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOut, useCurrentUser } from "@/lib/auth";
import { toastAcrossPages } from "@/lib/toast";

const NAME_BUTTON_ID = "change-name-button";
// The small text buttons in the dark bar (your name, "Add your name").
const navButton = "rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-nav-ink/10";

const LINKS = [
  { href: "/modules", label: "Modules" },
  { href: "/plan", label: "Plan" },
  { href: "/progress", label: "Progress" },
];

// The current page gets a marigold underline: a small touch of the 10% accent.
const linkClass = (active: boolean) =>
  `block border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? "border-accent text-nav-ink" : "border-transparent text-nav-muted hover:text-nav-ink"
  }`;

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  // True while the "Change your name" pop-up is open.
  const [editingName, setEditingName] = useState(false);

  async function logOut() {
    await signOut();
    toastAcrossPages("info", "You're logged out.");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-nav text-nav-ink">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          {/* The logo: a marigold "sprint" dash. */}
          <span aria-hidden="true" className="h-2 w-5 -skew-x-12 rounded-sm bg-accent" />
          StudySprint
        </Link>
        <ul className="ml-auto flex gap-1">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <ThemeToggle />
        {/* Nothing until we know whether you are logged in, so it doesn't flicker. */}
        {user === null && (
          <Link
            href="/login"
            aria-current={pathname === "/login" ? "page" : undefined}
            className={linkClass(pathname === "/login")}
          >
            Log in
          </Link>
        )}
        {user && (
          <div className="flex items-center gap-2">
            {user.name ? (
              // Your name; click it to change it. Long names are cut off with "…".
              <button
                id={NAME_BUTTON_ID}
                type="button"
                onClick={() => setEditingName(true)}
                // What screen readers say; it starts with the name people see.
                aria-label={`Logged in as ${user.name}. Change your name`}
                title={user.email ? `${user.name} (${user.email}). Click to change your name.` : "Click to change your name."}
                className={`flex max-w-32 items-center gap-1.5 font-medium text-nav-ink sm:max-w-56 ${navButton}`}
              >
                <span className="truncate">{user.name}</span>
                <span aria-hidden="true" className="text-xs text-nav-muted">
                  ✎
                </span>
              </button>
            ) : (
              <>
                {/* Older accounts have no name: show the email (too long for phones). */}
                <span className="hidden max-w-48 truncate text-sm text-nav-muted sm:inline">{user.email}</span>
                <button
                  id={NAME_BUTTON_ID}
                  type="button"
                  onClick={() => setEditingName(true)}
                  className={`text-nav-muted hover:text-nav-ink ${navButton}`}
                >
                  Add your name
                </button>
              </>
            )}
            <button
              type="button"
              onClick={logOut}
              className="rounded-lg border border-nav-muted/40 px-3 py-1.5 text-sm font-medium text-nav-ink transition-colors hover:bg-nav-ink/10"
            >
              Log out
            </button>
          </div>
        )}
        {user && editingName && (
          <NameDialog currentName={user.name} returnFocusTo={NAME_BUTTON_ID} onClose={() => setEditingName(false)} />
        )}
      </nav>
    </header>
  );
}
