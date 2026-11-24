"use client";

// A pop-up for adding or changing your name (the one shown in the header).
// It checks the name the same way as sign-up, saves it to your Supabase
// account, and closes with a "Saved" message. If saving fails, it stays open
// and says why, so nothing you typed is lost.

import { useState, type FormEvent } from "react";
import { FormField } from "@/components/FormField";
import { Modal } from "@/components/Modal";
import { updateName } from "@/lib/auth";
import { toast } from "@/lib/toast";
import { button, inputClass } from "@/lib/ui";
import { NAME_MAX, cleanName, validateName } from "@/lib/validation";

interface NameDialogProps {
  /** The name you have now, or null if you haven't set one yet. */
  currentName: string | null;
  /** id of the button that opened it, so focus returns there afterwards. */
  returnFocusTo?: string;
  onClose: () => void;
}

export function NameDialog({ currentName, returnFocusTo, onClose }: NameDialogProps) {
  const [name, setName] = useState(currentName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateName(name);
    if (problem) return setError(problem);

    const clean = cleanName(name);
    if (clean === currentName) return onClose(); // nothing changed

    setBusy(true);
    const result = await updateName(clean);
    setBusy(false);
    if (result.error) return setError(`Couldn't save your name: ${result.error}`);
    toast.success(`Saved. You're now shown as ${clean}.`);
    onClose();
  }

  const title = currentName ? "Change your name" : "Add your name";

  return (
    <Modal labelledBy="name-dialog-title" returnFocusTo={returnFocusTo} onCancel={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 p-5">
        <h3 id="name-dialog-title" className="text-lg font-semibold">
          {title}
        </h3>

        <FormField id="change-name" label="Your name" hint="Shown at the top of the page next to Log out." error={error ?? undefined}>
          <input
            type="text"
            autoComplete="name"
            maxLength={NAME_MAX}
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam Smith"
            autoFocus
          />
        </FormField>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={button.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={button.primary}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
