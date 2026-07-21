import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Equation } from "@/components/equations/equation";

describe("Equation", () => {
  it("renders valid LaTeX via KaTeX", () => {
    const { container } = render(<Equation latex="E = mc^2" />);
    expect(container.querySelector(".katex")).toBeTruthy();
  });

  it("falls back to the raw source for malformed LaTeX instead of throwing", () => {
    const malformed = "\\frac{1}{";
    render(<Equation latex={malformed} />);
    expect(screen.getByText(malformed)).toBeInTheDocument();
  });
});
