import { button, card } from "@/lib/ui";
import Link from "next/link";

const STEPS = [
  { title: "Add your exams", text: "Each module with its exam date, how hard it is, and the hours you need." },
  { title: "Tell us when you're free", text: "Answer three quick questions, or add your free time slot by slot." },
  { title: "Get your week", text: "A plan that puts the hardest, closest exams first and adapts when you miss a session." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16">
      <div className="flex flex-col gap-5">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Revise for every exam in the time you <span className="text-brand">actually</span> have.
        </h1>
        <p className="max-w-lg text-lg text-ink-muted">
          StudySprint turns your exam dates and free evenings into a day-by-day study plan.
        </p>
        <div>
          <Link href="/modules" className={button.accentLarge}>
            Plan my revision
          </Link>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className={`flex flex-col gap-1 ${card} p-4`}>
            <span className="text-sm font-semibold text-brand tabular-nums">0{i + 1}</span>
            <p className="font-medium">{step.title}</p>
            <p className="text-sm text-ink-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
