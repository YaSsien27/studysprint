import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Toaster } from "@/components/Toaster";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavBar } from "./NavBar";

// Outside a running Next.js app there is no router, so pretend we're on /plan.
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/plan",
  useRouter: () => router,
}));

// Pretend to be logged in or out without a real Supabase.
const auth = vi.hoisted(() => ({
  user: null as { email: string | null; name: string | null } | null | undefined,
  signOut: vi.fn(async () => {}),
  updateName: vi.fn<(name: string) => Promise<{ error: string | null }>>(async () => ({ error: null })),
}));
vi.mock("@/lib/auth", () => ({ useCurrentUser: () => auth.user, signOut: auth.signOut, updateName: auth.updateName }));

beforeEach(() => {
  auth.user = null;
  vi.clearAllMocks();
});

describe("NavBar", () => {
  it("links to Modules, Plan and Progress and marks the current page", () => {
    render(<NavBar />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modules" })).toHaveAttribute("href", "/modules");
    expect(screen.getByRole("link", { name: "Modules" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("href", "/plan");
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("href", "/progress");
    expect(screen.getByRole("link", { name: "StudySprint" })).toHaveAttribute("href", "/");
  });

  it("shows Log in when logged out", () => {
    render(<NavBar />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("shows nothing about the login while it is still checking", () => {
    auth.user = undefined;
    render(<NavBar />);
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("shows your name next to Log out", () => {
    auth.user = { email: "sam@example.com", name: "Sam Smith" };
    render(<NavBar />);
    // The extra words are for screen readers; people see only the name.
    const name = screen.getByRole("button", { name: "Logged in as Sam Smith. Change your name" });
    expect(name).toHaveAttribute("title", "Sam Smith (sam@example.com). Click to change your name.");
    expect(screen.queryByText("sam@example.com")).not.toBeInTheDocument();
  });

  it("shows your email for an older account without a name, and logs you out", async () => {
    auth.user = { email: "sam@example.com", name: null };
    render(<NavBar />);
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add your name" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(auth.signOut).toHaveBeenCalled();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
  });

  describe("changing your name", () => {
    const openDialog = () => {
      render(
        <>
          <NavBar />
          <Toaster />
        </>,
      );
      fireEvent.click(screen.getByRole("button", { name: /Change your name|Add your name/ }));
      return screen.getByRole("dialog");
    };

    it("opens with your name filled in and saves the new one", async () => {
      auth.user = { email: "sam@example.com", name: "Sam Smith" };
      const dialog = openDialog();
      expect(dialog).toHaveAccessibleName("Change your name");
      const field = screen.getByLabelText("Your name");
      expect(field).toHaveValue("Sam Smith");

      fireEvent.change(field, { target: { value: "  Samantha   Smith " } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(await screen.findByText("Saved. You're now shown as Samantha Smith.")).toBeInTheDocument();
      expect(auth.updateName).toHaveBeenCalledWith("Samantha Smith");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("lets an older account add a name", async () => {
      auth.user = { email: "sam@example.com", name: null };
      const dialog = openDialog();
      expect(dialog).toHaveAccessibleName("Add your name");
      expect(screen.getByLabelText("Your name")).toHaveValue("");
      fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Sam" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(auth.updateName).toHaveBeenCalledWith("Sam"));
    });

    it("won't save an empty or invalid name", () => {
      auth.user = { email: "sam@example.com", name: "Sam Smith" };
      openDialog();
      const field = screen.getByLabelText("Your name");
      fireEvent.change(field, { target: { value: "   " } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(field).toHaveAccessibleDescription(/Please enter your name/);
      fireEvent.change(field, { target: { value: "sam@home" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(field).toHaveAccessibleDescription(/Use only letters/);
      expect(auth.updateName).not.toHaveBeenCalled();
    });

    it("stays open and explains when saving fails", async () => {
      auth.user = { email: "sam@example.com", name: "Sam Smith" };
      auth.updateName.mockResolvedValueOnce({ error: "Network error" });
      openDialog();
      fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Sam Jones" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(screen.getByLabelText("Your name")).toHaveAccessibleDescription(/Couldn't save your name: Network error/),
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Your name")).toHaveValue("Sam Jones");
    });

    it("closes without saving on Cancel, or when nothing changed", () => {
      auth.user = { email: "sam@example.com", name: "Sam Smith" };
      openDialog();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Change your name/ }));
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(auth.updateName).not.toHaveBeenCalled();
    });
  });
});
