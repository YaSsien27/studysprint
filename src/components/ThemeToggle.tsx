"use client";

// The light/dark switch in the header. It flips data-theme on <html> (which
// swaps every colour in globals.css) and remembers your choice in this browser.
// Until you use it, the app follows your device's light or dark setting.

import { useLayoutEffect, useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function savedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null; // storage blocked, e.g. some private windows
  }
}

const deviceTheme = (): Theme => (window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light");

// Tells the switch to redraw when the theme changes.
const listeners = new Set<() => void>();

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  listeners.forEach((l) => l());
}

function choose(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not remembered, but it still switches for this visit.
  }
  apply(theme);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // While you haven't chosen, follow the device when its setting changes.
  const media = window.matchMedia?.(DARK_QUERY);
  const onDeviceChange = () => {
    if (!savedTheme()) apply(deviceTheme());
  };
  media?.addEventListener("change", onDeviceChange);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener("change", onDeviceChange);
  };
}

const currentTheme = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

export function ThemeToggle() {
  // null on the server, where nobody knows your setting yet.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);

  // In development React clears attributes on <html> when it remounts, so put
  // the right theme back before the screen is drawn. Does nothing in production.
  useLayoutEffect(() => {
    const wanted = savedTheme() ?? deviceTheme();
    if (document.documentElement.getAttribute("data-theme") !== wanted) apply(wanted);
  }, []);

  // Keep the space while starting up, so the header doesn't jump.
  if (theme === null) return <span aria-hidden="true" className="inline-block h-7 w-12" />;

  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => choose(dark ? "light" : "dark")}
      className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-nav-muted/40 bg-nav-ink/10 transition-colors hover:bg-nav-ink/20"
    >
      <span
        aria-hidden="true"
        className={`flex size-5 items-center justify-center rounded-full bg-nav-ink text-xs leading-none text-nav transition-transform motion-reduce:transition-none ${
          dark ? "translate-x-6" : "translate-x-0.5"
        }`}
      >
        {dark ? "☾" : "☀"}
      </span>
    </button>
  );
}
