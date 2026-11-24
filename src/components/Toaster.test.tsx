import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmSave, resetToasts, toast, toastAcrossPages } from "@/lib/toast";
import { Toaster } from "./Toaster";

afterEach(() => {
  vi.useRealTimers();
});

const region = () => screen.getByRole("region", { name: "Notifications" });

describe("Toaster", () => {
  it("shows toasts in a live region that screen readers announce", () => {
    render(<Toaster />);
    expect(region()).toHaveAttribute("aria-live", "polite");
    act(() => {
      toast.success("Module added.");
    });
    expect(within(region()).getByText("Module added.")).toBeInTheDocument();
  });

  it("closes a toast with its × button", () => {
    render(<Toaster />);
    act(() => {
      toast.info("You're logged out.");
    });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(within(region()).queryByText("You're logged out.")).not.toBeInTheDocument();
  });

  it("closes by itself after a few seconds; errors stay longer", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.success("Saved.");
      toast.error("Couldn't save.");
    });
    act(() => vi.advanceTimersByTime(4000));
    expect(within(region()).queryByText("Saved.")).not.toBeInTheDocument();
    expect(within(region()).getByText("Couldn't save.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(within(region()).queryByText("Couldn't save.")).not.toBeInTheDocument();
  });

  it("shows at most three at once, dropping the oldest", () => {
    render(<Toaster />);
    act(() => {
      ["one", "two", "three", "four"].forEach((m) => toast.success(m));
    });
    expect(within(region()).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("two"),
      expect.stringContaining("three"),
      expect.stringContaining("four"),
    ]);
  });
});

describe("confirmSave", () => {
  it("shows the success message only when the save worked", async () => {
    render(<Toaster />);
    await act(() => confirmSave(Promise.resolve(true), "Added History."));
    expect(within(region()).getByText("Added History.")).toBeInTheDocument();
  });

  it("shows an error instead when the save failed", async () => {
    render(<Toaster />);
    await act(() => confirmSave(Promise.resolve(false), "Added History."));
    expect(within(region()).queryByText("Added History.")).not.toBeInTheDocument();
    expect(within(region()).getByText(/Couldn't save your change/)).toBeInTheDocument();
  });
});

describe("toastAcrossPages", () => {
  // A full page reload wipes memory: here that is resetting the toast list
  // (without clearing storage) and showing a brand-new Toaster.
  function reloadPage() {
    const saved = sessionStorage.getItem("studysprint:flash");
    resetToasts();
    if (saved) sessionStorage.setItem("studysprint:flash", saved);
    cleanup();
    render(<Toaster />);
  }

  it("shows the toast again if the page reloads straight after", () => {
    render(<Toaster />);
    act(() => toastAcrossPages("success", "Welcome back!"));
    reloadPage();
    expect(within(region()).getByText("Welcome back!")).toBeInTheDocument();
  });

  it("doesn't show it twice: without a reload the saved copy is removed", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => toastAcrossPages("info", "You're logged out."));
    act(() => vi.advanceTimersByTime(5000));
    reloadPage();
    expect(within(region()).queryByText("You're logged out.")).not.toBeInTheDocument();
  });
});
