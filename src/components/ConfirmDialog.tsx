"use client";

// An "Are you sure?" pop-up, like the confirm box Windows shows before deleting.
// Cancel is focused first, so pressing Enter by accident is the safe choice.

import { button } from "@/lib/ui";
import { Modal } from "@/components/Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  /** Text on the red button, e.g. "Delete". */
  confirmLabel: string;
  /** id of the button that opened it, so focus returns there on Cancel. */
  returnFocusTo?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  returnFocusTo,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      role="alertdialog"
      labelledBy="confirm-title"
      describedBy="confirm-message"
      returnFocusTo={returnFocusTo}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-3 p-5">
        <h3 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h3>
        <p id="confirm-message" className="text-sm text-ink-muted">
          {message}
        </p>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className={button.secondary}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={button.danger}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
