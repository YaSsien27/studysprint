// The /modules page. This file is a Server Component (the default in the App
// Router); the interactive parts live in the Client Components it renders.

import type { Metadata } from "next";
import { ModulesSection } from "@/components/ModulesSection";
import { SlotsSection } from "@/components/SlotsSection";

export const metadata: Metadata = {
  title: "Modules & free time · StudySprint",
};

export default function ModulesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Modules &amp; free time</h1>
        <p className="text-ink-muted">
          Add the modules you have exams for and the times you are free each week.
          Everything is saved to your account, so it shows up on every device you log in on.
        </p>
      </div>

      <ModulesSection />
      <SlotsSection />
    </main>
  );
}
