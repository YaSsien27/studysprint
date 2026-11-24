"use client";

// The "Modules" part of the /modules page: a form to add a module and a list
// of saved modules. Each one has Edit (opens a pop-up, ModuleEditDialog) and
// Delete (asks "Are you sure?" first).

import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ModuleEditDialog } from "@/components/ModuleEditDialog";
import {
  EMPTY_MODULE_FORM,
  ModuleFields,
  formatExamDate,
  toModuleInput,
  type ModuleForm,
} from "@/components/ModuleFields";
import { SaveError } from "@/components/SaveError";
import { addRows, deleteRow, updateRow, useTable } from "@/lib/db/store";
import { newId } from "@/lib/id";
import { confirmSave } from "@/lib/toast";
import { button, card } from "@/lib/ui";
import { hasErrors, validateModule, type FieldErrors, type ModuleInput } from "@/lib/validation";
import type { Difficulty, Module } from "@/types";

const editButtonId = (id: string) => `edit-module-${id}`;
const deleteButtonId = (id: string) => `delete-module-${id}`;

export function ModulesSection() {
  const { rows: modules, status, error } = useTable("modules");
  const { rows: sessions } = useTable("study_sessions");
  // Form inputs are kept as text and converted to numbers on submit.
  const [form, setForm] = useState<ModuleForm>(EMPTY_MODULE_FORM);
  const [errors, setErrors] = useState<FieldErrors<ModuleInput>>({});
  // The module open in the Edit pop-up, or null.
  const [editing, setEditing] = useState<Module | null>(null);
  // The module waiting for "Are you sure?" before it is deleted, or null.
  const [deleting, setDeleting] = useState<Module | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page

    const input = toModuleInput(form);
    const result = validateModule(input);
    setErrors(result);
    if (hasErrors(result)) return;

    const newModule: Module = {
      id: newId(),
      name: input.name,
      examDate: input.examDate,
      difficulty: input.difficulty as Difficulty,
      estimatedHours: input.estimatedHours,
    };
    void confirmSave(addRows("modules", [newModule]), `Added ${newModule.name}.`);
    setForm(EMPTY_MODULE_FORM);
  }

  function saveEdit(before: Module, values: Omit<Module, "id">) {
    const updated: Module = { ...values, id: before.id };
    // The plan was made with the old exam date, difficulty and hours. If any of
    // them changed and this module has sessions, suggest making a new plan.
    const planChanged =
      values.examDate !== before.examDate ||
      values.difficulty !== before.difficulty ||
      values.estimatedHours !== before.estimatedHours;
    const hasSessions = sessions.some((s) => s.moduleId === before.id);
    const message =
      planChanged && hasSessions
        ? `Saved ${updated.name}. Generate a new plan on the Plan page to fit the changes.`
        : `Saved ${updated.name}.`;
    void confirmSave(updateRow("modules", updated), message);
  }

  function deleteModule(id: string) {
    const name = modules.find((m) => m.id === id)?.name ?? "Module";
    void confirmSave(deleteRow("modules", id), `Deleted ${name} and its study sessions.`);
  }

  const sorted = [...modules].sort((a, b) => a.examDate.localeCompare(b.examDate));

  return (
    <section aria-labelledby="modules-heading" className="flex flex-col gap-4">
      <h2 id="modules-heading" className="text-xl font-semibold">
        Modules
      </h2>

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`grid gap-4 ${card} p-4 sm:grid-cols-2`}
      >
        <ModuleFields
          idPrefix="module"
          form={form}
          errors={errors}
          onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        />

        <div className="sm:col-span-2">
          <button type="submit" className={button.primary}>
            Add module
          </button>
        </div>
      </form>

      <SaveError error={error} />

      {status === "loading" ? (
        <p className="text-sm text-ink-muted">Loading your modules…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-ink-muted">No modules yet.</p>
      ) : (
        <ul aria-label="Your modules" className="flex flex-col gap-2">
          {sorted.map((m) => (
            <li
              key={m.id}
              className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${card} px-4 py-3`}
            >
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-ink-muted">
                  Exam {formatExamDate(m.examDate)} · Difficulty {m.difficulty}/5 · {m.estimatedHours} h
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  id={editButtonId(m.id)}
                  type="button"
                  onClick={() => setEditing(m)}
                  aria-label={`Edit ${m.name}`}
                  className={button.quiet}
                >
                  Edit
                </button>
                <button
                  id={deleteButtonId(m.id)}
                  type="button"
                  onClick={() => setDeleting(m)}
                  aria-label={`Delete ${m.name}`}
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
        <ModuleEditDialog
          key={editing.id}
          module={editing}
          returnFocusTo={editButtonId(editing.id)}
          onSave={(values) => {
            saveEdit(editing, values);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          key={deleting.id}
          title="Delete module?"
          message={`${deleting.name} and its exam on ${formatExamDate(deleting.examDate)} will be removed. Its study sessions in your plan will be removed too. This can't be undone.`}
          confirmLabel="Delete"
          returnFocusTo={deleteButtonId(deleting.id)}
          onConfirm={() => {
            deleteModule(deleting.id);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
