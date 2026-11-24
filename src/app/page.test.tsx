import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("renders the main promise as the heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Revise for every exam in the time you actually have.");
  });

  it("links to the modules page", () => {
    render(<Home />);
    expect(
      screen.getByRole("link", { name: "Plan my revision" }),
    ).toHaveAttribute("href", "/modules");
  });

  it("explains the three steps", () => {
    render(<Home />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Add your exams")).toBeInTheDocument();
  });
});
