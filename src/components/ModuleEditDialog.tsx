"use client";

// A pop-up for editing one module, like the one for free time: it opens with
// the module's details filled in, with Cancel and Save changes.

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { ModuleFields, toModuleInput, type ModuleForm } from "@/components/ModuleFields";
import { button } from "@/lib/ui";
import { hasErrors, validateModule, type FieldErrors, type ModuleInput } from "@/lib/validation";
import type { Difficulty, Module } from "@/types";

interface ModuleEditDialogProps {
  module: Module;
  /** id of the Edit button, so focus returns there afterwards. */
  returnFocusTo?: string;
  onSave: (values: Omit<Module, "id">) => void;
  onCancel: () => void;
}

export function ModuleEditDialog({ module, returnFocusTo, onSave, onCancel }: ModuleEditDialogProps) {
  const [form, setForm] = useState<ModuleForm>({
    name: module.name,
    examDate: module.examDate,
    difficulty: String(module.difficulty),
    estimatedHours: String(module.estimatedHours),
  });
  const [errors, setErrors] = useState<FieldErrors<ModuleInput>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = toModuleInput(form);
    // Keeping the saved exam date is fine even if that exam has passed.
    const result = validateModule(input, undefined, module.examDate);
    setErrors(result);
    if (hasErrors(result)) return;
    onSave({
      name: input.name,
      examDate: input.examDate,
      difficulty: input.difficulty as Difficulty,
      estimatedHours: input.estimatedHours,
    });
  }

  return (
    <Modal labelledBy="edit-module-title" returnFocusTo={returnFocusTo} onCancel={onCancel}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 p-5">
        <h3 id="edit-module-title" className="text-lg font-semibold">
          Edit module
        </h3>

        <ModuleFields
          idPrefix="edit-module"
          form={form}
          errors={errors}
          onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={button.secondary}>
            Cancel
          </button>
          <button type="submit" className={button.primary}>
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
