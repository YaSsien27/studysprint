// Small pop-up messages ("toasts") that confirm what just happened, e.g.
// "Module added". Any component can call toast.success(...) or toast.error(...);
// the <Toaster /> in the layout shows them. Each one closes by itself after a
// few seconds (errors stay a little longer).

import { useSyncExternalStore } from "react";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DURATION_MS: Record<ToastKind, number> = { success: 4000, info: 4000, error: 7000 };
const MAX_VISIBLE = 3;

let toasts: Toast[] = [];
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function show(kind: ToastKind, message: string): number {
  const id = nextId++;
  // Newest last; drop the oldest if too many pile up.
  toasts = [...toasts, { id, kind, message }].slice(-MAX_VISIBLE);
  timers.set(id, setTimeout(() => dismiss(id), DURATION_MS[kind]));
  emit();
  return id;
}

export function dismiss(id: number) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
};

// ── Toasts that must survive a page change ───────────────────────────────
// Toasts live in memory, so a full page reload wipes them. Right after logging
// in or out the browser sometimes does exactly that. So such a toast is also
// saved for a moment in sessionStorage (this tab only); if the page reloads,
// <Toaster /> finds it there and shows it again. If no reload happens, the
// saved copy is removed after a few seconds so it never shows twice.
const FLASH_KEY = "studysprint:flash";
const FLASH_MS = 3000;

export function toastAcrossPages(kind: ToastKind, message: string) {
  show(kind, message);
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ kind, message, at: Date.now() }));
    setTimeout(() => sessionStorage.removeItem(FLASH_KEY), FLASH_MS);
  } catch {
    // Storage blocked (e.g. private mode): the normal toast still shows.
  }
}

/** Called once when the Toaster first appears: shows a toast saved before a reload. */
export function showSavedFlash() {
  try {
    const saved = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    if (!saved) return;
    const { kind, message, at } = JSON.parse(saved) as { kind: ToastKind; message: string; at: number };
    if (Date.now() - at < FLASH_MS * 2) show(kind, message);
  } catch {
    // Nothing usable saved.
  }
}

/**
 * Shows a success toast only once a save has really worked, or an error toast
 * if it failed. Pass the promise from addRows/updateRow/deleteRow/replaceRows.
 */
export async function confirmSave(saving: Promise<boolean>, successMessage: string) {
  if (await saving) toast.success(successMessage);
  else toast.error("Couldn't save your change. Check your connection and try again.");
}

const EMPTY: Toast[] = [];

/** The toasts on screen right now (for <Toaster />). */
export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
    () => EMPTY,
  );
}

/** Clears everything (used between tests). */
export function resetToasts() {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
  toasts = [];
  try {
    sessionStorage.removeItem(FLASH_KEY);
  } catch {}
  emit();
}
