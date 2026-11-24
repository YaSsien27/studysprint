// The /progress page: how much you've studied so far. A Server Component
// that only shows the title; ProgressView does the work in the browser.

import type { Metadata } from "next";
import { ProgressView } from "@/components/ProgressView";

export const metadata: Metadata = {
  title: "Progress · StudySprint",
};

export default function ProgressPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="text-ink-muted">
          Mark sessions as done on the Plan page and watch these bars fill up.
        </p>
      </div>
      <ProgressView />
    </main>
  );
}
