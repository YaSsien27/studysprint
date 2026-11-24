"use client";

// Email + password form with two modes: "Sign in" for existing accounts and
// "Create account" for new ones, which also asks for your name (shown in the
// header next to Log out). After success it goes to the page you asked
// for (e.g. /plan), or /modules.

import { button, card, inputClass } from "@/lib/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/FormField";
import { signIn, signUp } from "@/lib/auth";
import { NAME_MAX, cleanName, validateName } from "@/lib/validation";
import { toastAcrossPages } from "@/lib/toast";

interface LoginFormProps {
  next: string;
  /** Shown when the confirmation link didn't work. */
  initialError?: string | null;
}

const MIN_PASSWORD = 6; // Supabase's default minimum

export function LoginForm({ next, initialError = null }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signingUp = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (signingUp) {
      const nameError = validateName(name);
      if (nameError) return setError(nameError);
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (password.length < MIN_PASSWORD) return setError(`The password must be at least ${MIN_PASSWORD} characters.`);

    setBusy(true);
    const result = signingUp
      ? await signUp(email.trim(), password, cleanName(name), next)
      : await signIn(email.trim(), password);
    setBusy(false);

    if (result.error) return setError(result.error);
    if ("needsConfirmation" in result && result.needsConfirmation) {
      return setNotice(`Almost done: we sent a link to ${email.trim()}. Open it to confirm your account, then you're logged in.`);
    }
    toastAcrossPages(
      "success",
      signingUp ? `Account created. Welcome to StudySprint, ${cleanName(name)}!` : "Welcome back!",
    );
    router.replace(next);
    router.refresh(); // let the server see the new login cookies
  }

  function switchMode() {
    setMode(signingUp ? "signin" : "signup");
    setError(null);
    setNotice(null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="login-heading" className={`flex flex-col gap-4 ${card} p-6 shadow-sm`}>
      <h1 id="login-heading" className="text-3xl font-semibold tracking-tight">
        {signingUp ? "Create your account" : "Log in"}
      </h1>

      {signingUp && (
        <FormField id="name" label="Your name" hint="Shown at the top of the page next to Log out.">
          <input
            type="text"
            autoComplete="name"
            maxLength={NAME_MAX}
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam Smith"
          />
        </FormField>
      )}

      <FormField id="email" label="Email">
        <input
          type="email"
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField id="password" label="Password">
        <input
          type="password"
          autoComplete={signingUp ? "new-password" : "current-password"}
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-ink">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className={`${button.accent} w-full`}
      >
        {busy ? "Please wait…" : signingUp ? "Create account" : "Sign in"}
      </button>

      <p className="text-sm text-ink-muted">
        {signingUp ? "Already have an account?" : "New to StudySprint?"}{" "}
        <button type="button" onClick={switchMode} className="font-medium text-ink underline">
          {signingUp ? "Sign in instead" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
