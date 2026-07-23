import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VisualBlockRenderer } from "@/components/visuals/visual-block-renderer";
import { visualBlockSchema } from "@/lib/schema/visualBlocks";

function makeBlock(overrides: Partial<Parameters<typeof visualBlockSchema.parse>[0]>) {
  return visualBlockSchema.parse({
    id: "block-1",
    type: "scientific-diagram",
    templateId: "radial-charged-sphere",
    title: "Test visual",
    educationalPurpose: "Testing",
    accessibilityDescription: "A test visual.",
    parameters: {},
    ...overrides,
  });
}

describe("VisualBlockRenderer", () => {
  it("renders the matched template for a known templateId with valid parameters", () => {
    render(<VisualBlockRenderer block={makeBlock({})} />);
    expect(screen.getByLabelText("Observation radius r")).toBeInTheDocument();
  });

  it("shows an unsupported-visual fallback for an unknown templateId", () => {
    render(
      <VisualBlockRenderer
        block={makeBlock({ templateId: "not-a-real-template" })}
      />
    );
    expect(screen.getByText(/Unsupported visual type/)).toBeInTheDocument();
  });

  it("shows an unsupported-visual fallback when parameters fail validation", () => {
    render(
      <VisualBlockRenderer
        block={makeBlock({ parameters: { sphereType: "not-a-real-type" } })}
      />
    );
    expect(
      screen.getByText(/parameters could not be validated/)
    ).toBeInTheDocument();
  });

  const allTemplateIds = [
    "radial-charged-sphere",
    "force-vector-diagram",
    "particle-container",
    "process-flow-diagram",
    "coordinate-geometry",
    "wave-diagram",
    "simple-circuit",
    "long-charged-wire",
    "infinite-plane",
    "electric-dipole",
    "dielectric-polarization",
  ];

  it.each(allTemplateIds)("renders %s with default (empty) parameters", (templateId) => {
    render(
      <VisualBlockRenderer
        block={makeBlock({ templateId, parameters: {} })}
      />
    );
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });
});
