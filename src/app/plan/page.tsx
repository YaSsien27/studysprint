// The /plan page. A Server Component that only sets the title and layout;
// PlanView (a Client Component) does the work in the browser.

import type { Metadata } from "next";
import { PlanView } from "@/components/PlanView";

export const metadata: Metadata = {
  title: "Study plan · StudySprint",
};

export default function PlanPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Study plan</h1>
        <p className="text-ink-muted">
          Your study sessions, week by week. Generate a new plan whenever your modules or free time change.
        </p>
      </div>
      <PlanView />
    </main>
  );
}
