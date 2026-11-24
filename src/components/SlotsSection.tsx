"use client";

// The "Weekly free time" part of the /modules page: two ways to add free time
// side by side (Quick setup, or Add manually), and the saved slots with Edit
// and Delete. Editing opens a pop-up right where you are (SlotEditDialog).

import { button, card, inputClass } from "@/lib/ui";
import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { FreeTimeSetup } from "@/components/FreeTimeSetup";
import { PickerField } from "@/components/PickerField";
import { SlotEditDialog } from "@/components/SlotEditDialog";
import { TimeWheel } from "@/components/TimeWheel";
import { DAY_NAMES, MONDAY_FIRST, formatDuration, toMinutes } from "@/lib/dates";
import { newId } from "@/lib/id";
import { SaveError } from "@/components/SaveError";
import { addRows, deleteRow, replaceRows, updateRow, useTable } from "@/lib/db/store";
import { confirmSave } from "@/lib/toast";
import {
  hasErrors,
  validateSlot,
  type FieldErrors,
  type SlotInput,
} from "@/lib/validation";
import type { AvailabilitySlot, DayOfWeek } from "@/types";

// The wheels always show a time, so the form starts with a typical evening slot.
const EMPTY_FORM = { dayOfWeek: "1", startTime: "18:00", endTime: "19:00" };

// The open choice is filled navy; the closed one is a plain white button.
const toggleClass = `${button.secondary} aria-expanded:border-brand aria-expanded:bg-brand aria-expanded:text-brand-ink aria-expanded:hover:bg-brand-hover`;

/** Each slot's buttons get ids, so focus can return to them after a pop-up closes. */
const editButtonId = (slotId: string) => `edit-slot-${slotId}`;
const deleteButtonId = (slotId: string) => `delete-slot-${slotId}`;

const describeSlot = (s: AvailabilitySlot) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime}`;

export function SlotsSection() {
  const { rows: slots, status, error } = useTable("availability");
  // Which way of adding is open: the questionnaire, the manual form, or neither.
  const [panel, setPanel] = useState<"quick" | "manual" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors<SlotInput>>({});
  // The slot open in the edit pop-up, or null.
  const [editing, setEditing] = useState<AvailabilitySlot | null>(null);
  // The slot waiting for "Are you sure?" before it is deleted, or null.
  const [deleting, setDeleting] = useState<AvailabilitySlot | null>(null);

  function togglePanel(next: "quick" | "manual") {
    setPanel((current) => (current === next ? null : next));
    setErrors({});
  }

  function updateField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: SlotInput = {
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
    };

    const result = validateSlot(input);
    setErrors(result);
    if (hasErrors(result)) return;

    const slot: AvailabilitySlot = {
      id: newId(),
      dayOfWeek: input.dayOfWeek as DayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    };
    void confirmSave(addRows("availability", [slot]), `Added ${describeSlot(slot)}.`);
    // Keep the form open and the chosen day, so adding several slots is quick.
    setForm({ ...EMPTY_FORM, dayOfWeek: form.dayOfWeek });
  }

  function applySuggestion(suggested: Omit<AvailabilitySlot, "id">[], mode: "replace" | "add") {
    const withIds = suggested.map((slot) => ({ ...slot, id: newId() }));
    const count = `${withIds.length} free-time ${withIds.length === 1 ? "slot" : "slots"}`;
    void (mode === "replace"
      ? confirmSave(
          replaceRows("availability", withIds),
          // Nothing to replace yet? Then it's simply an add.
          slots.length === 0 ? `Added ${count}.` : `Replaced your free time with ${count}.`,
        )
      : confirmSave(addRows("availability", withIds), `Added ${count}.`));
  }

  function saveEdit(values: Omit<AvailabilitySlot, "id">) {
    if (!editing) return;
    const id = editing.id;
    const updated = { ...editing, ...values, id };
    void confirmSave(updateRow("availability", updated), `Saved ${describeSlot(updated)}.`);
    setEditing(null);
  }

  function deleteSlot(id: string) {
    const slot = slots.find((s) => s.id === id);
    void confirmSave(deleteRow("availability", id), slot ? `Deleted ${describeSlot(slot)}.` : "Deleted free time.");
  }

  const sorted = [...slots].sort(
    (a, b) =>
      MONDAY_FIRST.indexOf(a.dayOfWeek) - MONDAY_FIRST.indexOf(b.dayOfWeek) ||
      a.startTime.localeCompare(b.startTime),
  );

  return (
    <section id="free-time" aria-labelledby="slots-heading" className="flex scroll-mt-4 flex-col gap-4">
      <h2 id="slots-heading" className="text-xl font-semibold">
        Weekly free time
      </h2>

      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-4">
        <p className="text-sm text-ink-muted">
          Add the times you&apos;re free each week: answer 3 quick questions for a suggested week, or add
          slots yourself.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-expanded={panel === "quick"}
            aria-controls="quick-setup-panel"
            onClick={() => togglePanel("quick")}
            className={toggleClass}
          >
            Quick setup
          </button>
          <button
            type="button"
            aria-expanded={panel === "manual"}
            aria-controls="manual-slot-panel"
            onClick={() => togglePanel("manual")}
            className={toggleClass}
          >
            Add manually
          </button>
        </div>
      </div>

      {panel === "quick" && (
        <div id="quick-setup-panel">
          <FreeTimeSetup
            existingCount={slots.length}
            onApply={applySuggestion}
            onClose={() => setPanel(null)}
          />
        </div>
      )}

      {panel === "manual" && (
        <form
          id="manual-slot-panel"
          aria-label="Add free time manually"
          onSubmit={handleSubmit}
          noValidate
          className={`grid gap-4 ${card} p-4 sm:grid-cols-3`}
        >
          <FormField id="slot-day" label="Day" error={errors.dayOfWeek}>
            <select
              className={inputClass}
              value={form.dayOfWeek}
              onChange={(e) => updateField("dayOfWeek", e.target.value)}
            >
              {MONDAY_FIRST.map((day) => (
                <option key={day} value={day}>
                  {DAY_NAMES[day]}
                </option>
              ))}
            </select>
          </FormField>

          {(["startTime", "endTime"] as const).map((field) => {
            const id = field === "startTime" ? "slot-start" : "slot-end";
            return (
              <FormField
                key={field}
                id={id}
                label={field === "startTime" ? "Start time" : "End time"}
                error={errors[field]}
              >
                <PickerField display={form[field]}>
                  {(close) => (
                    <div className="flex flex-col items-center gap-2 p-3">
                      <TimeWheel
                        id={`${id}-wheel`}
                        labelledBy={`${id}-label`}
                        value={form[field]}
                        onChange={(time) => updateField(field, time)}
                      />
                      <button
                        type="button"
                        onClick={close}
                        className="w-full rounded-md px-3 py-1.5 text-sm font-medium hover:bg-sunken"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </PickerField>
              </FormField>
            );
          })}

          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <button
              type="submit"
              className={button.primary}
            >
              Add time slot
            </button>
            <button
              type="button"
              onClick={() => togglePanel("manual")}
              className={button.secondary}
            >
              Close
            </button>
          </div>
        </form>
      )}

      <SaveError error={error} />

      {status === "loading" ? (
        <p className="text-sm text-ink-muted">Loading your free time…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-ink-muted">No free time added yet.</p>
      ) : (
        <ul aria-label="Your free time" className="flex flex-col gap-2">
          {sorted.map((s) => (
            <li
              key={s.id}
              className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${card} px-4 py-3`}
            >
              <p>
                <span className="font-medium">{DAY_NAMES[s.dayOfWeek]}</span>{" "}
                {s.startTime}–{s.endTime}{" "}
                <span className="text-sm text-ink-muted">
                  ({formatDuration(toMinutes(s.endTime) - toMinutes(s.startTime))})
                </span>
              </p>
              <div className="flex gap-1">
                <button
                  id={editButtonId(s.id)}
                  type="button"
                  onClick={() => setEditing(s)}
                  aria-label={`Edit ${describeSlot(s)}`}
                  className={button.quiet}
                >
                  Edit
                </button>
                <button
                  id={deleteButtonId(s.id)}
                  type="button"
                  onClick={() => setDeleting(s)}
                  aria-label={`Delete ${describeSlot(s)}`}
                  className={button.quietDanger}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <SlotEditDialog
          // A new key per slot gives each edit a fresh pop-up with that slot's values.
          key={editing.id}
          slot={editing}
          returnFocusTo={editButtonId(editing.id)}
          onSave={saveEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          key={deleting.id}
          title="Delete free time?"
          message={`${describeSlot(deleting)} will be removed from your weekly free time. This can't be undone.`}
          confirmLabel="Delete"
          returnFocusTo={deleteButtonId(deleting.id)}
          onConfirm={() => {
            deleteSlot(deleting.id);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
