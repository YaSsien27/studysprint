"use client";

// A pop-up window for editing one free-time slot, like a dialog box on Windows:
// it opens over the page, right where you are, with Cancel and Save changes.

import { button, inputClass } from "@/lib/ui";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { TimeWheel } from "@/components/TimeWheel";
import { DAY_NAMES, MONDAY_FIRST } from "@/lib/dates";
import { hasErrors, validateSlot, type FieldErrors, type SlotInput } from "@/lib/validation";
import type { AvailabilitySlot, DayOfWeek } from "@/types";

interface SlotEditDialogProps {
  slot: AvailabilitySlot;
  /** id of the Edit button, so focus returns there afterwards. */
  returnFocusTo?: string;
  onSave: (values: Omit<AvailabilitySlot, "id">) => void;
  onCancel: () => void;
}

export function SlotEditDialog({ slot, returnFocusTo, onSave, onCancel }: SlotEditDialogProps) {
  const [day, setDay] = useState(String(slot.dayOfWeek));
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(slot.endTime);
  const [errors, setErrors] = useState<FieldErrors<SlotInput>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SlotInput = { dayOfWeek: Number(day), startTime, endTime };
    const result = validateSlot(input);
    setErrors(result);
    if (hasErrors(result)) return;
    onSave({ dayOfWeek: input.dayOfWeek as DayOfWeek, startTime, endTime });
  }

  const error = errors.dayOfWeek ?? errors.startTime ?? errors.endTime;

  return (
    <Modal labelledBy="edit-slot-title" returnFocusTo={returnFocusTo} onCancel={onCancel}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 p-5">
        <h3 id="edit-slot-title" className="text-lg font-semibold">
          Edit free time
        </h3>

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-slot-day" className="text-sm font-medium">
            Day
          </label>
          <select
            id="edit-slot-day"
            className={inputClass}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            {MONDAY_FIRST.map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <p id="edit-start-label" className="text-sm font-medium">
              Start time
            </p>
            <TimeWheel id="edit-start-wheel" labelledBy="edit-start-label" value={startTime} onChange={setStartTime} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p id="edit-end-label" className="text-sm font-medium">
              End time
            </p>
            <TimeWheel id="edit-end-wheel" labelledBy="edit-end-label" value={endTime} onChange={setEndTime} />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={button.secondary}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={button.primary}
          >
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
