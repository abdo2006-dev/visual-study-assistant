import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VisualBlockRenderer } from "@/components/visuals/visual-block-renderer";
import { visualBlockSchema } from "@/lib/schema/visualBlocks";

function makeBlock(overrides: Partial<Parameters<typeof visualBlockSchema.parse>[0]>) {
  return visualBlockSchema.parse({
    id: "block-1",
    type: "scientific-diagram",
    templateId: "long-charged-wire",
    title: "Test visual",
    educationalPurpose: "Testing",
    accessibilityDescription: "A test visual.",
    parameters: {},
    ...overrides,
  });
}

describe("VisualBlockRenderer / long-charged-wire", () => {
  it("renders the template for a known templateId with valid parameters", () => {
    render(<VisualBlockRenderer block={makeBlock({})} />);
    expect(screen.getByLabelText("Observation radius r")).toBeInTheDocument();
  });

  it("shows an unsupported-visual fallback when parameters fail validation", () => {
    render(
      <VisualBlockRenderer
        block={makeBlock({ parameters: { wireType: "not-a-real-type" } })}
      />
    );
    expect(
      screen.getByText(/parameters could not be validated/)
    ).toBeInTheDocument();
  });
});
