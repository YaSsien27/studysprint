"use client";

// Shows the toast messages in the bottom corner (bottom centre on phones).
// It lives in the layout, so a toast stays visible when you move to another page.
// The list is a "live region": screen readers read each new toast aloud.

import { card } from "@/lib/ui";
import { useEffect } from "react";
import { dismiss, showSavedFlash, useToasts, type ToastKind } from "@/lib/toast";

const STYLE: Record<ToastKind, { stripe: string; icon: string; label: string }> = {
  success: { stripe: "bg-success", icon: "text-success", label: "✓" },
  error: { stripe: "bg-danger", icon: "text-danger", label: "✕" },
  info: { stripe: "bg-brand", icon: "text-brand", label: "i" },
};

export function Toaster() {
  const toasts = useToasts();
  // After a full page reload, bring back a toast saved just before it.
  useEffect(showSavedFlash, []);

  return (
    <section
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end"
    >
      <ol className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const style = STYLE[t.kind];
          return (
            <li
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 overflow-hidden ${card} py-3 pr-2 pl-0 text-sm text-ink shadow-lg transition duration-200 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none`}
            >
              <span aria-hidden="true" className={`w-1 self-stretch rounded-r ${style.stripe}`} />
              <span aria-hidden="true" className={`w-4 shrink-0 text-center font-bold ${style.icon}`}>
                {style.label}
              </span>
              <p className="flex-1 pt-px">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded-md px-2 text-base leading-none text-ink-muted hover:bg-sunken hover:text-ink"
              >
                ×
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
