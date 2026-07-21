import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VisualBlockRenderer } from "@/components/visuals/visual-block-renderer";
import { visualBlockSchema } from "@/lib/schema/visualBlocks";

function makeBlock(overrides: Partial<Parameters<typeof visualBlockSchema.parse>[0]>) {
  return visualBlockSchema.parse({
    id: "block-1",
    type: "scientific-diagram",
    templateId: "infinite-plane",
    title: "Test visual",
    educationalPurpose: "Testing",
    accessibilityDescription: "A test visual.",
    parameters: {},
    ...overrides,
  });
}

describe("VisualBlockRenderer / infinite-plane", () => {
  it("renders the template for a known templateId with valid parameters", () => {
    render(<VisualBlockRenderer block={makeBlock({})} />);
    expect(screen.getByLabelText("Observation position x")).toBeInTheDocument();
  });

  it("renders the parallel-plates configuration too", () => {
    render(
      <VisualBlockRenderer
        block={makeBlock({ parameters: { configuration: "parallel-plates" } })}
      />
    );
    expect(screen.getByLabelText("Observation position x")).toBeInTheDocument();
  });

  it("shows an unsupported-visual fallback when parameters fail validation", () => {
    render(
      <VisualBlockRenderer
        block={makeBlock({ parameters: { configuration: "not-a-real-config" } })}
      />
    );
    expect(
      screen.getByText(/parameters could not be validated/)
    ).toBeInTheDocument();
  });
});
