import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_SCRIPT, THEME_STORAGE_KEY } from "@/lib/theme";
import { ThemeToggle } from "./ThemeToggle";

const html = document.documentElement;

/** Pretends the device is set to dark or light mode. */
function deviceIsDark(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark && query.includes("dark"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  localStorage.clear();
  html.removeAttribute("data-theme");
  deviceIsDark(false);
});
afterEach(() => vi.unstubAllGlobals());

describe("ThemeToggle", () => {
  it("is a 'Dark mode' switch that turns dark mode on and off and remembers it", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("switch", { name: "Dark mode" });
    expect(toggle).not.toBeChecked();
    expect(html).toHaveAttribute("data-theme", "light");

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAttribute("title", "Switch to light mode");
    expect(html).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(html).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("follows the device's dark setting until you choose", () => {
    deviceIsDark(true);
    render(<ThemeToggle />);
    expect(screen.getByRole("switch", { name: "Dark mode" })).toBeChecked();
    expect(html).toHaveAttribute("data-theme", "dark");
  });

  it("uses your saved choice over the device setting", () => {
    deviceIsDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(<ThemeToggle />);
    expect(screen.getByRole("switch", { name: "Dark mode" })).not.toBeChecked();
    expect(html).toHaveAttribute("data-theme", "light");
  });
});

describe("THEME_SCRIPT (runs before the page is drawn)", () => {
  const runScript = () => new Function(THEME_SCRIPT)();

  it("applies the saved choice", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runScript();
    expect(html).toHaveAttribute("data-theme", "dark");
  });

  it("otherwise follows the device, and ignores odd saved values", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "purple");
    deviceIsDark(true);
    runScript();
    expect(html).toHaveAttribute("data-theme", "dark");
    deviceIsDark(false);
    runScript();
    expect(html).toHaveAttribute("data-theme", "light");
  });
});
