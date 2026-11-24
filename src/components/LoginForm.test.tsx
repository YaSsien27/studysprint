import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// Pretend Supabase answers, without a real one.
const auth = vi.hoisted(() => ({
  signIn: vi.fn<(email: string, password: string) => Promise<{ error: string | null }>>(async () => ({
    error: null,
  })),
  signUp: vi.fn<
    (email: string, password: string, name: string, next: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  >(async () => ({ error: null, needsConfirmation: false })),
}));
vi.mock("@/lib/auth", () => auth);

beforeEach(() => {
  vi.clearAllMocks();
});

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

describe("LoginForm", () => {
  it("signs in and goes to the page you wanted", async () => {
    render(<LoginForm next="/plan" />);
    fill(" sam@example.com ", "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/plan"));
    expect(auth.signIn).toHaveBeenCalledWith("sam@example.com", "secret123");
  });

  it("checks the email and password before asking Supabase", () => {
    render(<LoginForm next="/modules" />);
    fill("not-an-email", "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid email");

    fill("sam@example.com", "123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("at least 6 characters");
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it("shows the error from Supabase, e.g. a wrong password", async () => {
    auth.signIn.mockResolvedValueOnce({ error: "Invalid login credentials" });
    render(<LoginForm next="/modules" />);
    fill("sam@example.com", "wrong-pass");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login credentials");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("creates an account and says to check your email when confirmation is on", async () => {
    auth.signUp.mockResolvedValueOnce({ error: null, needsConfirmation: true });
    render(<LoginForm next="/modules" />);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "  Sam   Smith " } });
    fill("new@example.com", "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("status")).toHaveTextContent("we sent a link to new@example.com");
    expect(auth.signUp).toHaveBeenCalledWith("new@example.com", "secret123", "Sam Smith", "/modules");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("goes straight in after creating an account when no confirmation is needed", async () => {
    render(<LoginForm next="/plan" />);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Sam Smith" } });
    fill("new@example.com", "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/plan"));
  });

  it("asks for your name only when creating an account", () => {
    render(<LoginForm next="/modules" />);
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    const field = screen.getByLabelText("Your name");
    expect(field).toHaveAccessibleDescription(/Shown at the top of the page/);
    fireEvent.click(screen.getByRole("button", { name: "Sign in instead" }));
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
  });

  it("won't create an account without a valid name", () => {
    render(<LoginForm next="/modules" />);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fill("new@example.com", "secret123");

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter your name.");

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "sam@home" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Use only letters");
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});
