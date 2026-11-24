"use client";

// The shared base for pop-up windows (edit a slot, confirm a delete).
// It uses the browser's <dialog> element as a modal: it opens over the page,
// keeps keyboard focus inside, and blocks the page behind it. Escape or a tap
// on the dark area around the box cancels. When it closes, focus goes back to
// the button that opened it, so you stay where you were.

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  /** id of the pop-up's title, which names it for screen readers. */
  labelledBy: string;
  /** id of the text that explains it (used by confirm boxes). */
  describedBy?: string;
  /** "alertdialog" for confirm boxes that ask before something can't be undone. */
  role?: "dialog" | "alertdialog";
  /** id of the element to focus after closing, e.g. the Edit or Delete button. */
  returnFocusTo?: string;
  onCancel: () => void;
  children: ReactNode;
}

export function Modal({ labelledBy, describedBy, role, returnFocusTo, onCancel, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;

    // The test environment (jsdom) has no showModal()/close(); there the dialog
    // just opens in place. Every current browser has both.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");

    return () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      // By now the page behind is usable again. Safari doesn't focus buttons on
      // click, so the id is more reliable than "whatever was focused before".
      const target = (returnFocusTo && document.getElementById(returnFocusTo)) || opener;
      if (target?.isConnected) target.focus();
    };
    // Opened once per pop-up; returnFocusTo is read when it closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Escape: the browser fires "cancel"; we let React decide when to close.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      // A tap on the dark area around the box lands on the <dialog> itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl bg-surface p-0 text-ink shadow-2xl transition duration-150 backdrop:bg-[rgb(12_16_26/0.55)] backdrop:backdrop-blur-sm starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
    >
      {children}
    </dialog>
  );
}
